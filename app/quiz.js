/* =========================================================
   算数マスター v2 — 出題エンジン (quiz.js)
   ========================================================= */
const Quiz = (() => {
'use strict';

const $  = (s,r=document) => r.querySelector(s);
const $$ = (s,r=document) => [...r.querySelectorAll(s)];
const esc = s => String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
// 【】で囲むとマーカー、$..$ は式として少し大きく
const rich = s => esc(s)
  .replace(/【(.+?)】/g, '<span class="hl">$1</span>')
  .replace(/\$(.+?)\$/g, '<b style="font-size:1.08em">$1</b>')
  .replace(/\n/g, '<br>');

let S = null;   // セッション状態

/* ---------- 問題データの正規化 ---------- */
function normalize(q, ctx = {}) {
  const o = Object.assign({}, q);
  o.unit = o.unit || ctx.unit || 'misc';
  o.lv   = o.lv || ctx.lv || 1;
  o.kind = (o.ans != null) ? 'num' : 'mc';
  if (o.kind === 'mc' && !Array.isArray(o.opts)) o.kind = 'num';
  o.hints = o.hints || (o.hint ? [o.hint] : []);
  o.steps = o.steps || null;
  return o;
}

/* ---------- 図 ---------- */
const figHTML = f => (f ? Fig.render(f) : '');

/* ---------- 読み上げ ---------- */
let _voice = null;
function pickVoice() {
  if (!window.speechSynthesis) return null;
  const vs = speechSynthesis.getVoices();
  _voice = vs.find(v => v.lang === 'ja-JP' && /Kyoko|Otoya|O-ren|Hattori/i.test(v.name))
        || vs.find(v => v.lang === 'ja-JP') || null;
  return _voice;
}
if (window.speechSynthesis) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function speak(text) {
  if (!window.speechSynthesis) return;
  speechSynthesis.cancel();
  const t = String(text)
    .replace(/【|】|\$/g,'')
    .replace(/(\d+)\/(\d+)/g, '$2分の$1')
    .replace(/(\d+(?:\.\d+)?)cm²/g,'$1平方センチメートル').replace(/(\d+(?:\.\d+)?)m²/g,'$1平方メートル')
    .replace(/(\d+(?:\.\d+)?)km²/g,'$1平方キロメートル')
    .replace(/(\d+(?:\.\d+)?)cm³/g,'$1立方センチメートル').replace(/(\d+(?:\.\d+)?)m³/g,'$1立方メートル')
    .replace(/(\d+(?:\.\d+)?)cm/g,'$1センチメートル').replace(/(\d+(?:\.\d+)?)mm/g,'$1ミリメートル')
    .replace(/(\d+(?:\.\d+)?)km/g,'$1キロメートル').replace(/(\d+(?:\.\d+)?)kg/g,'$1キログラム')
    .replace(/(\d+(?:\.\d+)?)mL/g,'$1ミリリットル').replace(/(\d+(?:\.\d+)?)L/g,'$1リットル')
    .replace(/(\d+(?:\.\d+)?)m(?![ある-ん])/g,'$1メートル')
    .replace(/(\d+(?:\.\d+)?)g(?![ぁ-ん])/g,'$1グラム')
    .replace(/×/g,' かける ').replace(/÷/g,' わる ').replace(/＝|=/g,' は ')
    .replace(/°/g,'度').replace(/％|%/g,'パーセント');
  const u = new SpeechSynthesisUtterance(t);
  u.lang='ja-JP'; u.rate=0.95; u.pitch=1.1; if (_voice) u.voice=_voice;
  speechSynthesis.speak(u);
}

/* ---------- 演出 ---------- */
function fxLayer() { let l = $('#fx'); if (!l) { l = document.createElement('div'); l.id='fx'; document.body.appendChild(l);} return l; }
function confetti(power = 1) {
  const l = fxLayer(), N = Math.round(46*power);
  const cols = ['#ff8a3d','#38bdf8','#5cc85c','#ff6f91','#fbbf24','#a78bfa'];
  for (let i=0;i<N;i++) {
    const d = document.createElement('i');
    const sz = 7+Math.random()*9;
    d.style.cssText = `position:absolute;left:${10+Math.random()*80}%;top:-20px;width:${sz}px;height:${sz*(.5+Math.random())}px;
      background:${cols[i%cols.length]};border-radius:${Math.random()<.4?'50%':'2px'};opacity:.95;
      transform:rotate(${Math.random()*360}deg);`;
    l.appendChild(d);
    const dur = 1100+Math.random()*900, drift = (Math.random()-.5)*260;
    d.animate([{transform:`translate(0,0) rotate(0)`,opacity:1},
               {transform:`translate(${drift}px,${window.innerHeight+60}px) rotate(${720*(Math.random()>.5?1:-1)}deg)`,opacity:.85}],
              {duration:dur, easing:'cubic-bezier(.25,.6,.5,1)'}).onfinish = () => d.remove();
  }
}
function comboPop(n) {
  const e = document.createElement('div');
  e.className='combo'; e.textContent = `${n}れんぞく！`;
  fxLayer().appendChild(e); setTimeout(()=>e.remove(), 950);
}
function toast(msg, ms = 2200) {
  const t = document.createElement('div'); t.className='toast'; t.innerHTML = msg;
  document.body.appendChild(t);
  setTimeout(()=>{ t.style.transition='opacity .3s'; t.style.opacity=0; setTimeout(()=>t.remove(),320); }, ms);
}

/* ---------- 手書きメモ ---------- */
function memoPad(host) {
  const c = host.querySelector('canvas');
  const dpr = window.devicePixelRatio || 1;
  const fit = () => { const r=c.getBoundingClientRect(); c.width=r.width*dpr; c.height=r.height*dpr; const x=c.getContext('2d'); x.scale(dpr,dpr); x.lineCap='round'; x.lineJoin='round'; };
  fit();
  const x = c.getContext('2d');
  let drawing=false, color='#2b3245', w=3, erase=false;
  const pos = e => { const r=c.getBoundingClientRect(); return [e.clientX-r.left, e.clientY-r.top]; };
  c.addEventListener('pointerdown', e => { drawing=true; c.setPointerCapture(e.pointerId); const [a,b]=pos(e); x.beginPath(); x.moveTo(a,b); });
  c.addEventListener('pointermove', e => { if(!drawing) return; const [a,b]=pos(e);
    x.globalCompositeOperation = erase?'destination-out':'source-over';
    x.strokeStyle=color; x.lineWidth = erase?18:w; x.lineTo(a,b); x.stroke(); });
  ['pointerup','pointercancel','pointerleave'].forEach(ev=>c.addEventListener(ev,()=>drawing=false));
  host.querySelectorAll('.sw').forEach(b => b.addEventListener('click', () => {
    host.querySelectorAll('.sw').forEach(s=>s.classList.remove('on')); b.classList.add('on');
    color=b.dataset.c; erase=false; host.querySelector('[data-act=erase]')?.classList.remove('on');
  }));
  host.querySelector('[data-act=erase]')?.addEventListener('click', e => { erase=!erase; e.target.classList.toggle('on', erase); });
  host.querySelector('[data-act=clear]')?.addEventListener('click', () => x.clearRect(0,0,c.width,c.height));
  window.addEventListener('resize', () => { const d=c.toDataURL(); fit(); const img=new Image(); img.onload=()=>x.drawImage(img,0,0,c.getBoundingClientRect().width,c.getBoundingClientRect().height); img.src=d; });
}
const memoHTML = `
<div class="memo" id="memo">
  <canvas></canvas>
  <div class="memo-bar">
    <span class="sw on" data-c="#2b3245" style="background:#2b3245"></span>
    <span class="sw" data-c="#ef4444" style="background:#ef4444"></span>
    <span class="sw" data-c="#2563eb" style="background:#2563eb"></span>
    <span class="sw" data-c="#16a34a" style="background:#16a34a"></span>
    <button class="tool" data-act="erase">消しゴム</button>
    <button class="tool" data-act="clear">ぜんぶ消す</button>
  </div>
</div>`;

/* =========================================================
   セッション
   ========================================================= */
function start(opts) {
  const pool = opts.pool.map(q => normalize(q, opts));
  const n = opts.count || Store.get('dailyGoal') || 5;
  const list = opts.list || Store.buildSession(pool, n, { only: opts.only });
  if (!list.length) { opts.host.innerHTML = `<div class="card"><p class="muted">出せる問題がありません。</p></div>`; return; }
  S = {
    list, i:0, host:opts.host, title:opts.title||'', unitId:opts.unitId,
    correct:0, combo:0, maxCombo:0, hintUsed:false, anyHint:false,
    wrongIds:[], answered:false, hintStep:0, retry: !!opts.retry, onDone:opts.onDone,
    mode: opts.mode || 'normal', results: [], noFinishUI: !!opts.noFinishUI,
  };
  render();
}

function render() {
  const q = S.list[S.i];
  const c = Store.state.cards[q.id];
  const tag = !c || !c.box ? '<span class="chip new">はじめて</span>'
            : c.box >= 5 ? '<span class="chip">しあげ</span>'
            : '<span class="chip rev">ふくしゅう</span>';
  const lv = q.lv >= 4 ? `<span class="chip lv">レベル${q.lv}</span>` : '';
  const pat = q.pattern ? `<span class="chip">${esc(q.pattern)}</span>` : '';
  const check = S.mode === 'check';
  const WHY = {'なおし':['🔁','d'],'ふくしゅう':['♻️','rev'],'よわいところ':['🧱','new'],
               'あたらしい':['✨','new'],'おうよう':['🔥','lv'],'しあげ':['🏁','']};
  const w = q._why && WHY[q._why];
  const why = w ? `<span class="chip ${w[1]}">${w[0]} ${q._why}</span>` : '';
  const lead = q.lead ? `<div class="lead">${rich(q.lead)}${figHTML(q.leadFig)}</div>` : '';
  const given = q.given ? `<div class="given"><span class="lab">わかっていること</span>${
      q.given.map(g=>`<div>${rich(g)}</div>`).join('')}</div>` : '';
  const part = q.partTotal ? `<span class="chip lv">(${q.partIndex}) / 全${q.partTotal}問</span>` : '';

  S.host.innerHTML = `
  <div class="q-shell">
    <div class="q-progress"><i style="width:${(S.i/S.list.length)*100}%"></i></div>
    <div class="q-meta">
      <span class="chip">${S.i+1} / ${S.list.length}</span>${check?'<span class="chip new">チェック</span>':tag}${why}${lv}${part}${pat}
      ${q.tag && q.tag !== q.pattern ? `<span class="chip">${esc(q.tag)}</span>` : ''}
    </div>
    ${lead}${given}
    <div class="q-text">${rich(q.q)}</div>
    ${figHTML(q.fig)}
    <div id="answer"></div>
    <div class="q-tools">
      ${(!check && q.hints.length)?`<button class="tool" id="t-hint">💡 ヒント</button>`:''}
      <button class="tool" id="t-memo">📝 メモ・ひっ算</button>
      <button class="tool" id="t-read">🔊 よみあげ</button>
      ${check?'':'<button class="tool" id="t-give">🤔 わからない</button>'}
    </div>
    <div id="hints"></div>
    ${memoHTML}
    <div id="verdict"></div>
  </div>`;

  S.answered = false; S.hintStep = 0; S.hintUsed = false;
  renderAnswer(q);
  memoPad($('#memo'));

  $('#t-hint')?.addEventListener('click', showHint);
  $('#t-memo').addEventListener('click', e => { $('#memo').classList.toggle('open'); e.target.classList.toggle('on'); });
  $('#t-read').addEventListener('click', () => speak((q.lead ? q.lead + '。' : '') + q.q));
  $('#t-give')?.addEventListener('click', () => { SFX.tap(); judge(q, null, false); });
  if (Store.get('autoRead')) speak(q.q);
  window.scrollTo({top:0, behavior:'smooth'});
}

function renderAnswer(q) {
  const host = $('#answer');
  if (q.kind === 'mc') {
    const keys = ['ア','イ','ウ','エ','オ'];
    const idx = q._order || (q._order = Store.shuffle(q.opts.map((_,i)=>i)));
    const two = q.opts.every(o => String(o).length <= 8);
    host.innerHTML = `<div class="opts ${two?'two':''}">` + idx.map((oi,k) =>
      `<button class="opt" data-i="${oi}"><span class="k">${keys[k]}</span><span>${rich(q.opts[oi])}</span></button>`).join('') + `</div>`;
    $$('.opt', host).forEach(b => b.addEventListener('click', () => {
      if (S.answered) return;
      SFX.tap();
      judge(q, Number(b.dataset.i), Number(b.dataset.i) === q.a, b);
    }));
  } else {
    host.innerHTML = `
    <div class="numin">
      <div class="disp" id="disp"><span id="dv">?</span>${q.unitLabel?`<span class="unit">${esc(q.unitLabel)}</span>`:''}</div>
      <div class="pad">
        ${[1,2,3,4,5,6,7,8,9].map(d=>`<button data-d="${d}">${d}</button>`).join('')}
        <button data-d="." class="act">・</button>
        <button data-d="0">0</button>
        <button data-act="del" class="act">⌫</button>
        <button data-act="go" class="go" style="grid-column:1/-1">こたえる</button>
      </div>
    </div>`;
    let buf = '';
    const dv = $('#dv');
    const upd = () => { dv.textContent = buf || '?'; };
    $$('.pad button', host).forEach(b => b.addEventListener('click', () => {
      if (S.answered) return;
      SFX.tap();
      const d = b.dataset.d, a = b.dataset.act;
      if (a === 'del') buf = buf.slice(0,-1);
      else if (a === 'go') {
        if (!buf) { $('#disp').classList.add('blink'); setTimeout(()=>$('#disp').classList.remove('blink'),400); return; }
        const v = parseFloat(buf);
        const tol = q.tol || 0;
        judge(q, buf, Math.abs(v - q.ans) <= tol + 1e-9);
        return;
      }
      else if (d === '.' && (buf.includes('.') || !buf)) return;
      else if (buf.length < 9) buf += d;
      upd();
    }));
    upd();
  }
}

function showHint() {
  const q = S.list[S.i];
  if (S.hintStep >= q.hints.length) return;
  const h = q.hints[S.hintStep];
  S.hintStep++; S.hintUsed = true; S.anyHint = true;
  const labels = ['どこを見る？','図にすると','あと一歩'];
  const box = document.createElement('div');
  box.className = 'hint-box';
  box.innerHTML = `<div class="lab">💡 ヒント${S.hintStep} — ${labels[Math.min(S.hintStep-1,2)]}</div>${rich(typeof h==='string'?h:h.text||'')}
    ${typeof h==='object'&&h.fig?figHTML(h.fig):''}`;
  $('#hints').appendChild(box);
  SFX.tap();
  if (S.hintStep >= q.hints.length) $('#t-hint').disabled = true;
}

function judge(q, given, ok, btn) {
  if (S.answered) return;
  S.answered = true;
  const gave = given !== null;

  if (q.kind === 'mc') {
    $$('.opt').forEach(b => {
      const i = Number(b.dataset.i);
      if (i === q.a) b.classList.add('ok');
      else if (gave && i === given) b.classList.add('ng');
      else b.classList.add('dim');
    });
  } else {
    $('#disp').classList.add(ok ? 'ok' : 'ng');
  }

  const res = Store.grade(q.id, ok, q.unit, { usedHint: S.hintUsed });
  S.results.push({ id:q.id, unit:q.unit, ok, given, q });
  if (ok) {
    S.correct++; S.combo++; S.maxCombo = Math.max(S.maxCombo, S.combo);
    SFX.correct();
    if (S.combo >= 3) { comboPop(S.combo); SFX.combo(S.combo); }
    if (S.combo >= 5) confetti(.6);
    if (S.retry) Store.markFixed();
  } else {
    S.combo = 0; S.wrongIds.push(q.id);
    SFX.wrong();
  }

  const who = Store.state.chara || 'pika';
  const words = ok
    ? ['やった！','その調子！','ばっちり！','つよい！','いいね！','さすが！']
    : ['おしい！ここが分かれ道。','大丈夫、いま覚えれば勝ち。','1回まちがえた問題は 強くなるチャンス。'];
  const word = gave ? words[Math.floor(Math.random()*words.length)] : 'いっしょに 見てみよう。';

  const ansText = q.kind === 'mc' ? q.opts[q.a] : `${q.ans}${q.unitLabel||''}`;

  // チェックテスト中は答えを見せずに進む（あとでまとめて解説）
  if (S.mode === 'check') {
    $('#verdict').innerHTML = `<div class="verdict ${ok?'ok':'ng'}" style="text-align:center;padding:12px">
      <div class="head" style="justify-content:center;margin:0">${ok?'⭕️':'❌'}<span style="font-size:.85rem;font-weight:700;color:var(--sub)">解説はさいごにまとめて</span></div></div>`;
    setTimeout(() => { S.i++; S.i < S.list.length ? render() : finish(); }, 620);
    return;
  }
  const nextIn = res.next === Store.today() ? 'きょう もう1回' : `つぎは ${Store.daysBetween(Store.today(), res.next)}日後`;

  $('#verdict').innerHTML = `
  <div class="verdict ${ok?'ok':'ng'}">
    <div class="head">${ok?'⭕️ せいかい':'❌ まちがい'}<span style="font-size:.8rem;font-weight:700;color:var(--sub)">＋${res.gain}コイン・${nextIn}</span></div>
    ${Chara.tag(who, ok?(S.combo>=3?'excited':'happy'):'thinking', word, 84)}
    <div class="why">
      <div style="font-weight:900;margin-bottom:6px">こたえ：<span style="color:var(--a)">${rich(String(ansText))}</span></div>
      ${q.pattern?`<div style="font-size:.8rem;color:var(--sub);font-weight:800;margin-bottom:6px">🔑 使う道具：${esc(q.pattern)}</div>`:''}
      ${q.steps ? `<div class="steps">${q.steps.map(s=>`<div class="step">${rich(s)}</div>`).join('')}</div>` : ''}
      ${q.why ? `<div style="margin-top:${q.steps?'8px':'0'}">${rich(q.why)}</div>` : ''}
      ${figHTML(q.whyFig)}
      ${q.memo ? `<div class="note b" style="margin-bottom:0">${rich(q.memo)}</div>` : ''}
    </div>
    <button class="btn wide ${ok?'green':'blue'}" id="next" style="margin-top:14px">${S.i+1 < S.list.length ? 'つぎの問題 →' : '結果を見る 🎉'}</button>
  </div>`;

  $('#next').addEventListener('click', () => { SFX.tap(); S.i++; S.i < S.list.length ? render() : finish(); });
  if (Store.get('autoRead')) setTimeout(()=>speak((ok?'せいかい。':'まちがい。')+ (q.why||'')), 350);
  $('#verdict').scrollIntoView({behavior:'smooth', block:'nearest'});
  Chara.bindTap($('#verdict'));
}

function finish() {
  if (S.mode === 'check') return finishCheck();
  if (S.noFinishUI) { if (S.onDone) S.onDone({ ok:S.correct, total:S.list.length, results:S.results }); return; }
  const total = S.list.length, ok = S.correct;
  const perfect = ok === total;
  Store.touchStreak();
  const ctx = { combo:S.maxCombo, perfect, noHint:!S.anyHint, jkCleared: jkClearedCount() };
  const badges = Store.checkBadges(ctx);
  const unlocks = Store.checkUnlocks(ctx);
  const st = Store.state;

  if (perfect) { confetti(1.6); SFX.clear(); } else if (ok/total >= .6) { confetti(.8); SFX.clear(); } else SFX.tap();

  const who = st.chara || 'pika';
  const msg = perfect ? 'ぜんもん せいかい！！ 完璧だ！'
    : ok/total>=.6 ? 'よくやった！ まちがえた分は 明日また出るよ。'
    : 'まちがいは 覚えるチャンス。今日のぶんは ちゃんと箱に入れたよ。';

  const revisit = S.wrongIds.length;
  S.host.innerHTML = `
  <div class="card" style="text-align:center">
    <h2 style="justify-content:center">${perfect?'🎉 パーフェクト！':'🎯 おつかれさま！'}</h2>
    <div style="display:flex;justify-content:center;margin:4px 0">${Chara.svg(who, perfect?'excited':'happy', 150, {anim:'hop'})}</div>
    <div style="font-size:2.4rem;font-weight:900;letter-spacing:.02em">${ok} <span style="font-size:1.2rem;color:var(--sub)">/ ${total}問</span></div>
    <p class="muted" style="margin-bottom:14px">${msg}</p>
    <div class="stats" style="margin-bottom:6px">
      <div class="stat hot"><div class="ico">🔥</div><div class="n">${st.streak.n}</div><div class="l">れんぞく日</div></div>
      <div class="stat"><div class="ico">⚡</div><div class="n">${S.maxCombo}</div><div class="l">さいだいコンボ</div></div>
      <div class="stat coin"><div class="ico">🪙</div><div class="n">${st.day.coins}</div><div class="l">きょうのコイン</div></div>
      <div class="stat crown"><div class="ico">📦</div><div class="n">${Store.masteredCount()}</div><div class="l">マスター</div></div>
    </div>
  </div>
  ${badges.length ? `<div class="card"><h2>🏅 バッジ ゲット！</h2><div class="badges">
      ${badges.map(b=>`<div class="badge got"><div class="e">${b.e}</div><div class="n">${b.n}</div><div class="d">${b.d}</div></div>`).join('')}
    </div></div>` : ''}
  ${unlocks.length ? `<div class="card"><h2>🎁 なかまが ふえた！</h2>
      ${unlocks.map(u=>`<div style="display:flex;align-items:center;gap:12px;margin:8px 0">
        ${Chara.svg(u.who,'excited',96)}<div><div style="font-weight:900">${Chara.info(u.who).name}</div>
        <div class="muted">${Chara.info(u.who).role}／${u.label}で なかまに！</div></div></div>`).join('')}
      <a class="btn ghost wide sm" href="zukan.html">なかまを 見にいく</a></div>` : ''}
  <div class="card">
    ${revisit ? `<button class="btn wide" id="again">🔁 まちがえた${revisit}問を もう1回</button>
      <p class="muted" style="text-align:center;margin-top:8px">ここで直すと、記憶に残りやすい</p>` : ''}
    <a class="btn ghost wide" href="index.html" style="margin-top:${revisit?'10px':'0'}">🏠 ホームへ</a>
  </div>`;

  $('#again')?.addEventListener('click', () => {
    const pool = S.list.filter(q => S.wrongIds.includes(q.id));
    start({ pool, list: pool, host:S.host, retry:true, unitId:S.unitId });
  });
  Chara.bindTap(S.host);
  if (S.onDone) S.onDone({ ok, total });
}

/* ---------- チェックテストの結果 ---------- */
function finishCheck() {
  const total = S.list.length, ok = S.correct;
  const { demoted, shaky } = Mastery.finishCheck(S.results);
  Store.touchStreak();
  const rate = Math.round(ok/total*100);
  const msg = rate >= 90 ? 'ぬけ落ちなし。ちゃんと身についてる！'
    : rate >= 60 ? 'だいたい残ってる。落とした所だけ直そう。'
    : demoted.length ? `${demoted.length}つの単元に すきまが見つかった。ここを埋めれば もっと強くなる。`
    : 'ここは まだ固まっていないみたい。あせらず もう一周しよう。';
  const back = demoted.concat(shaky.filter(u => !demoted.find(d => d.id === u.id)));

  if (rate >= 80 && !demoted.length) { confetti(1.2); SFX.clear(); } else { SFX.wrong(); }

  S.host.innerHTML = `
  <div class="card" style="text-align:center">
    <h2 style="justify-content:center">🩺 チェックの結果</h2>
    <div style="display:flex;justify-content:center">${Chara.svg('fukurou', demoted.length?'thinking':'happy', 130)}</div>
    <div style="font-size:2.4rem;font-weight:900">${ok} <span style="font-size:1.2rem;color:var(--sub)">/ ${total}問</span></div>
    <p class="muted">${msg}</p>
  </div>
  ${back.length ? `<div class="card">
    <h2>🧱 もう一度やる単元</h2>
    <p class="muted" style="margin-bottom:10px">できたつもりだった所です。${demoted.length ? `このうち <b>${demoted.length}つ</b>は おさらいの列に戻しました。` : 'つぎのチェックでも落とすと、おさらいの列に戻します。'}</p>
    ${back.map(u=>`<a class="unit" style="display:flex;align-items:center;gap:10px;margin-bottom:8px" href="train.html?unit=${encodeURIComponent(u.id)}">
      <span style="font-size:1.3rem">${u.emoji}</span><span style="flex:1"><span class="t">${esc(u.name)}</span>
      <span class="m">${esc(u.tag||'')}</span></span><span style="color:var(--a);font-weight:800">▶︎</span></a>`).join('')}
  </div>` : ''}
  <div class="card">
    <h2>📖 ぜんぶの解説</h2>
    ${S.results.map((r,i) => {
      const q = r.q;
      const ansText = q.kind === 'mc' ? q.opts[q.a] : `${q.ans}${q.unitLabel||''}`;
      return `<details class="more" ${r.ok?'':'open'} style="border-top:1px dashed var(--line);padding-top:10px">
        <summary>${r.ok?'⭕️':'❌'} ${i+1}. ${esc(String(q.q).replace(/【|】/g,'').slice(0,34))}…</summary>
        <div class="why" style="margin-top:8px">
          <div style="font-weight:900;margin-bottom:6px">こたえ：<span style="color:var(--a)">${rich(String(ansText))}</span></div>
          ${q.steps ? `<div class="steps">${q.steps.map(t=>`<div class="step">${rich(t)}</div>`).join('')}</div>` : ''}
          ${q.why ? `<div style="margin-top:6px">${rich(q.why)}</div>` : ''}
          ${figHTML(q.whyFig)}
        </div></details>`;
    }).join('')}
  </div>
  <div class="card"><a class="btn wide" href="index.html">🏠 ホームへ</a></div>`;
  window.scrollTo({top:0, behavior:'smooth'});
  if (S.onDone) S.onDone({ ok, total, demoted, shaky });
}

function jkClearedCount() {
  if (!window.DATA) return 0;
  return (DATA.units||[]).filter(u => u.id.startsWith('jk-'))
    .filter(u => Store.unitStats(u.id, DATA.byUnit(u.id).map(q=>q.id)).done).length;
}

return { start, normalize, speak, confetti, toast, comboPop, figHTML, rich, memoPad, memoHTML };
})();
if (typeof window !== 'undefined') window.Quiz = Quiz;
