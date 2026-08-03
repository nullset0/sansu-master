/* =========================================================
   紙の代わりになる練習モード (modes.js)

   「記述・作図・処理速度」は紙が要ると言ったが、
   分けて考えると 大半はアプリのほうが うまくやれる。

   ① タイムアタック   … 処理速度。紙より正確に測れる（アプリの勝ち）
   ② 道具えらび       … 問題文だけ見て「何算か」を当てる。
                         中受で いちばん差がつくのはここ。記述の核心でもある
   ③ 手順ならべかえ   … 解く順番を組み立てる。「書く」の代わりに「組む」
   ④ 印刷シート       … どうしても手で書きたいときのために（print.html）

   ①〜③は 既存の1205問から【自動生成】する。新しく作問はしない。
   ========================================================= */
const Modes = (() => {
'use strict';
const $ = (s,r=document) => r.querySelector(s);
const $$ = (s,r=document) => [...r.querySelectorAll(s)];
const esc = s => String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const rich = s => Quiz.rich(s);
const fmt = ms => (ms/1000).toFixed(1);

/* ---------- ① タイムアタック ---------- */
function timeAttack(host, opts = {}) {
  const n = opts.n || 20;
  const st = Store.state;
  // ここは【計算のスピード】をきたえる場所。文章題は入れない
  const CALC = ['jk-gyakusan','jk-bunsu-keisan','jk-kufu',
    'g2-九九','g2-ひっさん','g3-わり算','g3-小数','g3-分数','g3-大きい数',
    'g4-小数','g4-分数','g4-計算順序','g4-大きい数','g4-がい数','g4-単位',
    'g5-分数','g6-分数かけ割り'];
  const isCalc = q => CALC.indexOf(q.unit) >= 0;
  // 4択も数値入力も両方つかう（小学校の計算問題は4択のため）
  const all = DATA.all().filter(isCalc);
  // すでに一度は正解した問題を優先（知らない問題でタイムを測っても意味がない）
  const known = all.filter(q => st.cards[q.id] && st.cards[q.id].ok > 0);
  const src = known.length >= n ? known : all;
  const list = Store.shuffle(src).slice(0, n).map(q => Quiz.normalize(q));
  if (list.length < 3) { host.innerHTML = '<div class="card"><p class="muted">まだ問題が足りません。ふつうの練習を少しやってから来てください。</p><a class="btn ghost wide" href="index.html">ホームへ</a></div>'; return; }

  let i = 0, ok = 0, t0 = 0, times = [], buf = '', tick = null;
  const rec = st.records = st.records || {};
  const best = rec.timeAttack && rec.timeAttack.best;

  function render() {
    const q = list[i];
    host.innerHTML = `
    <div class="q-shell">
      <div class="ta-bar">
        <span class="chip">${i+1} / ${list.length}</span>
        <span class="chip rev">⭕️ ${ok}</span>
        <span class="ta-time" id="ta-time">0.0<small>秒</small></span>
      </div>
      <div class="q-progress"><i style="width:${i/list.length*100}%"></i></div>
      <div class="q-text" style="font-size:1.5rem;text-align:center;margin:18px 0">${rich(q.q)}</div>
      ${q.kind === 'mc' ? `<div class="opts two">${
          Store.shuffle(q.opts.map((_,k)=>k)).map(oi =>
            `<button class="opt" data-i="${oi}"><span>${rich(q.opts[oi])}</span></button>`).join('')
        }</div>`
      : `<div class="numin">
        <div class="disp" id="disp"><span id="dv">?</span>${q.unitLabel?`<span class="unit">${esc(q.unitLabel)}</span>`:''}</div>
        <div class="pad">
          ${[1,2,3,4,5,6,7,8,9].map(d=>`<button data-d="${d}">${d}</button>`).join('')}
          <button data-d="." class="act">・</button><button data-d="0">0</button>
          <button data-act="del" class="act">⌫</button>
          <button data-act="go" class="go" style="grid-column:1/-1">こたえる</button>
        </div>
      </div>`}
    </div>`;
    buf = ''; t0 = performance.now();
    const tEl = $('#ta-time');
    clearInterval(tick);
    tick = setInterval(() => { tEl.firstChild.textContent = fmt(performance.now() - t0); }, 100);
    if (q.kind === 'mc') {
      $$('.opt').forEach(b => b.addEventListener('click', () => {
        SFX.tap(); submit(Number(b.dataset.i) === q.a, b);
      }));
      return;
    }
    const dv = $('#dv');
    $$('.pad button').forEach(b => b.addEventListener('click', () => {
      SFX.tap();
      const d = b.dataset.d, a = b.dataset.act;
      if (a === 'del') buf = buf.slice(0,-1);
      else if (a === 'go') return submit();
      else if (d === '.' && (buf.includes('.') || !buf)) return;
      else if (buf.length < 9) buf += d;
      dv.textContent = buf || '?';
    }));
  }
  function submit(mcOK, btn) {
    const q = list[i];
    if (q.kind !== 'mc' && !buf) { $('#disp').classList.add('blink'); setTimeout(()=>$('#disp').classList.remove('blink'),400); return; }
    clearInterval(tick);
    const dt = performance.now() - t0;
    const correct = q.kind === 'mc' ? !!mcOK : Math.abs(parseFloat(buf) - q.ans) <= (q.tol||0) + 1e-9;
    times.push({ id:q.id, ms:dt, ok:correct, q });
    if (correct) { ok++; SFX.correct(); } else SFX.wrong();
    Store.grade(q.id, correct, q.unit, {});
    if (q.kind === 'mc') {
      $$('.opt').forEach(x => x.classList.add(Number(x.dataset.i) === q.a ? 'ok' : (x === btn ? 'ng' : 'dim')));
    } else $('#disp').classList.add(correct ? 'ok' : 'ng');
    setTimeout(() => { i++; i < list.length ? render() : finish(); }, correct ? 260 : 900);
  }
  function finish() {
    const total = times.reduce((a,t)=>a+t.ms,0);
    const avg = total / times.length;
    const rate = Math.round(ok/times.length*100);
    const target = 20000;   // 中受の計算は 1問20秒が目安
    const rec2 = rec.timeAttack = rec.timeAttack || { best:null, count:0 };
    const isBest = ok === times.length && (!rec2.best || avg < rec2.best);
    if (isBest) rec2.best = avg;
    rec2.count++; rec2.last = avg; Store.save();
    Store.markTraining('time');
    Store.touchStreak();
    if (isBest) { Quiz.confetti(1.4); SFX.clear(); }

    const slow = times.slice().sort((a,b)=>b.ms-a.ms).slice(0,3);
    host.innerHTML = `
    <div class="card" style="text-align:center">
      <h2 style="justify-content:center">⏱ タイムアタック</h2>
      <div style="display:flex;justify-content:center">${Chara.svg(st.chara||'pika', isBest?'excited':(rate>=80?'happy':'thinking'), 130)}</div>
      <div style="font-size:2.6rem;font-weight:900;font-variant-numeric:tabular-nums">${fmt(total)}<span style="font-size:1.1rem;color:var(--sub)">秒</span></div>
      <p class="muted">${ok} / ${times.length}問せいかい ・ 1問あたり <b>${fmt(avg)}秒</b>
        ${isBest ? '<br>🎉 自己ベスト更新！' : (best ? `<br>これまでのベスト ${fmt(best)}秒／問` : '')}</p>
      <div class="note ${avg<=target?'c':'d'}" style="text-align:left">
        <strong>${avg<=target ? '✅ 中学受験の目安（1問20秒）はクリア。' : '⏳ 目安は1問20秒。'}</strong>
        計算が速いほど、大問を考える時間が残ります。
      </div>
    </div>
    <div class="card">
      <h2>🐢 時間がかかった3問</h2>
      ${slow.map(t=>`<div class="unit" style="margin-bottom:8px">
        <div class="t">${rich(t.q.q)}</div>
        <div class="m">${fmt(t.ms)}秒 ・ ${t.ok?'せいかい':'まちがい'} ・ こたえ ${
          t.q.kind === 'mc' ? esc(String(t.q.opts[t.q.a])) : esc(t.q.ans + (t.q.unitLabel||''))}</div></div>`).join('')}
    </div>
    <div class="card">
      <button class="btn wide" id="again">🔁 もう1回</button>
      <a class="btn ghost wide" href="index.html" style="margin-top:10px">🏠 ホームへ</a>
    </div>`;
    $('#again').onclick = () => timeAttack(host, opts);
  }
  render();
}

/* ---------- ② 道具えらび（何算か を当てる） ---------- */
function patternPick(host, opts = {}) {
  const n = opts.n || 8;
  const st = Store.state;
  const withP = DATA.all().filter(q => q.pattern && q.unit.indexOf('jk-') === 0);
  // すでに一度は解いた問題を優先（知らない型は当てられない）
  const known = withP.filter(q => st.cards[q.id] && st.cards[q.id].seen);
  const list = Store.shuffle(known.length >= n ? known : withP).slice(0, n);
  if (!list.length) { host.innerHTML = '<div class="card"><p class="muted">まだ問題がありません。</p></div>'; return; }

  let i = 0, ok = 0, answered = false;
  const areaOf = q => (DATA.unit(q.unit)||{}).area;

  function render() {
    const q = list[i];
    const same = DATA.all().filter(x => x.pattern && x.pattern !== q.pattern && areaOf(x) === areaOf(q));
    const others = [...new Set(same.map(x => x.pattern))];
    const wrong = Store.shuffle(others).slice(0, 3);
    while (wrong.length < 3) {
      const p = Store.shuffle([...new Set(DATA.all().map(x=>x.pattern).filter(Boolean))])[0];
      if (p && p !== q.pattern && wrong.indexOf(p) < 0) wrong.push(p);
    }
    const choices = Store.shuffle([q.pattern, ...wrong]);
    const keys = ['ア','イ','ウ','エ'];
    host.innerHTML = `
    <div class="q-shell">
      <div class="q-meta"><span class="chip">${i+1} / ${list.length}</span><span class="chip new">🔧 道具えらび</span></div>
      <div class="q-progress"><i style="width:${i/list.length*100}%"></i></div>
      <div class="note b" style="margin-top:0"><strong>この問題を解くのに使う道具は？</strong><br>
        <span class="muted" style="font-size:.85rem">答えは出さなくていい。何算かだけ見ぬく。</span></div>
      ${q.lead ? `<div class="lead">${rich(q.lead)}</div>` : ''}
      <div class="q-text">${rich(q.q)}</div>
      ${q.fig ? Quiz.figHTML(q.fig) : ''}
      <div class="opts">${choices.map((c,k)=>`<button class="opt" data-p="${esc(c)}">
        <span class="k">${keys[k]}</span><span>${esc(c)}</span></button>`).join('')}</div>
      <div id="verdict"></div>
    </div>`;
    answered = false;
    $$('.opt').forEach(b => b.addEventListener('click', () => {
      if (answered) return; answered = true;
      const correct = b.dataset.p === q.pattern;
      $$('.opt').forEach(x => x.classList.add(x.dataset.p === q.pattern ? 'ok' : (x === b ? 'ng' : 'dim')));
      if (correct) { ok++; SFX.correct(); } else SFX.wrong();
      Store.note(q.unit, correct);
      const u = DATA.unit(q.unit) || {};
      $('#verdict').innerHTML = `
      <div class="verdict ${correct?'ok':'ng'}">
        <div class="head">${correct?'⭕️ そのとおり':'❌ ちがう道具'}</div>
        <div class="why">
          <div style="font-weight:900;margin-bottom:6px">使う道具：<span style="color:var(--a)">${esc(q.pattern)}</span></div>
          ${u.teach ? `<div>${rich(u.teach.key)}</div>` : ''}
          ${q.hints && q.hints.length ? `<div class="note" style="margin-bottom:0">💡 ${rich(typeof q.hints[0]==='string'?q.hints[0]:'')}</div>` : ''}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px">
          <a class="btn ghost sm" href="learn.html#${q.unit}">📖 解き方を見る</a>
          <button class="btn sm ${correct?'green':'blue'}" id="next">${i+1<list.length?'つぎ →':'結果'}</button>
        </div>
      </div>`;
      $('#next').onclick = () => { SFX.tap(); i++; i<list.length ? render() : finish(); };
    }));
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function finish() {
    const rate = Math.round(ok/list.length*100);
    Store.touchStreak();
    Store.markTraining('pattern');
    if (rate >= 80) { Quiz.confetti(1.2); SFX.clear(); }
    host.innerHTML = `
    <div class="card" style="text-align:center">
      <h2 style="justify-content:center">🔧 道具えらび</h2>
      <div style="display:flex;justify-content:center">${Chara.svg(Store.state.chara||'pika', rate>=80?'excited':'thinking',130)}</div>
      <div style="font-size:2.4rem;font-weight:900">${ok} <span style="font-size:1.1rem;color:var(--sub)">/ ${list.length}問</span></div>
      <p class="muted">${rate>=80 ? '問題を見た瞬間に型が見えている。ここが速いと、入試で時間が余ります。'
        : '「何算か」を見ぬく力は、答えを出す力とは別物。ここは何度もやると急に見えるようになります。'}</p>
    </div>
    <div class="card"><button class="btn wide" id="again">🔁 もう1回</button>
      <a class="btn ghost wide" href="index.html" style="margin-top:10px">🏠 ホームへ</a></div>`;
    $('#again').onclick = () => patternPick(host, opts);
  }
  render();
}

/* ---------- ③ 手順ならべかえ ---------- */
function stepOrder(host, opts = {}) {
  const n = opts.n || 5;
  const st = Store.state;
  const src = DATA.all().filter(q => q.steps && q.steps.length >= 3 && q.steps.length <= 5);
  const known = src.filter(q => st.cards[q.id] && st.cards[q.id].seen);
  const list = Store.shuffle(known.length >= n ? known : src).slice(0, n);
  if (!list.length) { host.innerHTML = '<div class="card"><p class="muted">まだ問題がありません。</p></div>'; return; }

  let i = 0, ok = 0;
  function render() {
    const q = list[i];
    const order = q.steps.map((s,k) => ({ s, k }));
    const shuffled = Store.shuffle(order);
    let picked = [];
    host.innerHTML = `
    <div class="q-shell">
      <div class="q-meta"><span class="chip">${i+1} / ${list.length}</span><span class="chip new">🪜 手順ならべかえ</span>
        ${q.pattern?`<span class="chip">${esc(q.pattern)}</span>`:''}</div>
      <div class="q-progress"><i style="width:${i/list.length*100}%"></i></div>
      ${q.lead ? `<div class="lead">${rich(q.lead)}</div>` : ''}
      <div class="q-text">${rich(q.q)}</div>
      ${q.fig ? Quiz.figHTML(q.fig) : ''}
      <div class="note b"><strong>解く順に タップして ならべよう</strong></div>
      <div class="steps" id="picked"></div>
      <div class="opts" id="bank">${shuffled.map(o=>`<button class="opt" data-k="${o.k}"><span>${rich(o.s)}</span></button>`).join('')}</div>
      <div class="q-tools"><button class="tool" id="undo">↩︎ 1つもどす</button></div>
      <div id="verdict"></div>
    </div>`;
    const bank = $('#bank'), pick = $('#picked');
    const draw = () => {
      pick.innerHTML = picked.map(o=>`<div class="step">${rich(o.s)}</div>`).join('');
      $$('#bank .opt').forEach(b => b.style.display = picked.find(o=>o.k===Number(b.dataset.k)) ? 'none' : '');
      if (picked.length === q.steps.length) judge();
    };
    $$('#bank .opt').forEach(b => b.addEventListener('click', () => {
      SFX.tap(); picked.push(order[Number(b.dataset.k)]); draw();
    }));
    $('#undo').onclick = () => { picked.pop(); $('#verdict').innerHTML=''; draw(); };

    function judge() {
      const correct = picked.every((o,k) => o.k === k);
      if (correct) { ok++; SFX.correct(); Quiz.confetti(.5); } else SFX.wrong();
      Store.note(q.unit, correct);
      $('#verdict').innerHTML = `
      <div class="verdict ${correct?'ok':'ng'}">
        <div class="head">${correct?'⭕️ その順で合っている':'❌ 順番がちがう'}</div>
        <div class="why">
          <div style="font-weight:900;margin-bottom:6px">正しい順</div>
          <div class="steps">${q.steps.map(s=>`<div class="step">${rich(s)}</div>`).join('')}</div>
          ${q.why?`<div style="margin-top:8px">${rich(q.why)}</div>`:''}
        </div>
        <button class="btn wide ${correct?'green':'blue'}" id="next" style="margin-top:12px">${i+1<list.length?'つぎ →':'結果'}</button>
      </div>`;
      $('#next').onclick = () => { SFX.tap(); i++; i<list.length ? render() : finish(); };
      $('#verdict').scrollIntoView({behavior:'smooth', block:'nearest'});
    }
    draw();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function finish() {
    Store.touchStreak();
    Store.markTraining('steps');
    const rate = Math.round(ok/list.length*100);
    if (rate>=80) { Quiz.confetti(1.2); SFX.clear(); }
    host.innerHTML = `
    <div class="card" style="text-align:center">
      <h2 style="justify-content:center">🪜 手順ならべかえ</h2>
      <div style="display:flex;justify-content:center">${Chara.svg(Store.state.chara||'pika', rate>=80?'excited':'thinking',130)}</div>
      <div style="font-size:2.4rem;font-weight:900">${ok} <span style="font-size:1.1rem;color:var(--sub)">/ ${list.length}問</span></div>
      <p class="muted">答えを出す前に「どういう順で考えるか」を組み立てられると、書く問題にも強くなります。</p>
    </div>
    <div class="card"><button class="btn wide" id="again">🔁 もう1回</button>
      <a class="btn ghost wide" href="index.html" style="margin-top:10px">🏠 ホームへ</a></div>`;
    $('#again').onclick = () => stepOrder(host, opts);
  }
  render();
}

return { timeAttack, patternPick, stepOrder };
})();
if (typeof window !== 'undefined') window.Modes = Modes;
