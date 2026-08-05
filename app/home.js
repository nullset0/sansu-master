/* =========================================================
   ホーム画面の組み立て (home.js)  — v3: 適応学習に対応
   ========================================================= */
(() => {
'use strict';
const $ = s => document.querySelector(s);
const esc = s => String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
const st = Store.state;
const who = st.chara || 'pika';

/* ---- あいさつ ---- */
const h = new Date().getHours();
const greet = h < 9 ? 'おはよう！' : h < 17 ? 'こんにちは！' : h < 20 ? 'おかえり！' : 'こんばんは！';
// 1日の量は入試日からの逆算で自動的に決まる（「おまかせ」のとき）。
// 子どもには数だけ見せる。目標校も残り日数も画面には出さない。
const goal = (typeof Goal !== 'undefined' && Goal.dailyCount()) || Number(Store.get('dailyGoal')) || 5;
const left = Math.max(0, goal - st.day.done);
const expr = left === 0 ? 'excited' : (h >= 21 ? 'sleep' : 'happy');

$('#hero-ch').innerHTML = Chara.svg(who, expr, 88);
$('#hello').textContent = greet;
$('#hello-sub').textContent = left === 0
  ? `きょうのぶんは 終わり！ ${st.day.correct}問せいかい 🎉`
  : (h >= 20 ? 'ねる前がいちばん覚えられる時間だよ' : `のこり ${left}問`);

/* ---- ステータス ---- */
const sum = Mastery.summary();
$('#stats').innerHTML = `
  <div class="stat hot"><div class="ico">🔥</div><div class="n">${st.streak.n}</div><div class="l">れんぞく日</div></div>
  <div class="stat"><div class="ico">🎓</div><div class="n">${sum.done}</div><div class="l">クリア単元</div></div>
  <div class="stat coin"><div class="ico">🪙</div><div class="n">${st.coins}</div><div class="l">コイン</div></div>
  <div class="stat crown"><div class="ico">🏅</div><div class="n">${Object.keys(st.badges).length}</div><div class="l">バッジ</div></div>`;

/* ---- ① まだレベル診断をしていない ---- */
if (!Mastery.placementDone()) {
  $('#checkcard').innerHTML = `
    <div class="card" style="border:3px solid var(--f)">
      <h2>🎈 はじめに：レベル診断</h2>
      ${Chara.tag('fukurou','happy','どこから始めるかを決めるよ。かんたんな学年から少しずつ出すね。3問ぜんぶ合っていたら、その学年は とばして先へ進むよ。', 96)}
      <a class="btn wide blue" href="train.html?mode=placement" style="margin-top:8px">▶︎ 診断をはじめる（3〜18問）</a>
      <p class="muted" style="text-align:center;margin-top:8px">あとからでもOK。とばすと1年生から順にやります。</p>
    </div>`;
}

/* ---- ② ときどきチェック ---- */
const due = Mastery.checkDue();
if (due && Mastery.placementDone()) {
  const label = { unit:'単元が4つすすんだ', weekly:'1週間たった', monthly:'1か月たった' }[due] || '';
  $('#checkcard').innerHTML += `
    <div class="card" style="border:3px solid var(--e)">
      <h2>🩺 チェックの時間</h2>
      ${Chara.tag('fukurou','thinking', `${label}ね。ヒント無しで10問。ここで落ちた単元は もう一度おさらいの列にもどすよ。「できたつもり」をつぶすのが目的。`, 96)}
      <a class="btn wide" href="train.html?mode=check" style="margin-top:8px;background:linear-gradient(180deg,#ffd166,#f0a500);box-shadow:0 4px 0 #c98a00">▶︎ チェックを受ける（10問）</a>
    </div>`;
}

/* ---- ②-b なぜ？チェック（本質）：3層そろった単元は これで「済」になる ---- */
// チェックの日と重なっても出す。ここを通さないと単元が「済」にならないので、
// 先送りにすると到達がいつまでも増えない。
const why = Mastery.explainDue(1)[0];
if (why && Mastery.placementDone()) {
  const wu = DATA.unit(why);
  $('#checkcard').innerHTML += `
    <div class="card" style="border:3px solid var(--f,#a78bfa)">
      <h2>🧠 なぜ？チェック</h2>
      ${Chara.tag('fukurou','normal', `${wu.emoji} <b>${esc(wu.name)}</b> は もう解けるね。あとは「なぜそれで解けるか」。<br>計算はしない。何算かを見ぬくだけ。ここを通ると この単元は済になるよ。`, 96, {html:true})}
      <a class="btn wide" href="train.html?mode=why&unit=${encodeURIComponent(why)}" style="margin-top:8px;background:linear-gradient(180deg,#c4b5fd,#8b5cf6);box-shadow:0 4px 0 #6d28d9">▶︎ なぜ？チェックを受ける（4〜5問）</a>
    </div>`;
}

/* ---- ③ きょうは とくべつ練習の日？（アプリ側が決める）---- */
const tr = Mastery.trainingDue();
if (tr && Mastery.placementDone() && !due) {
  const say = { time:'計算がにぶってないか、3分で見てみよう。',
                pattern:'型がたまってきた。問題を見た瞬間に見ぬけるか ためそう。',
                steps:'答えより先に「どう考えるか」を組み立てる練習をしよう。' }[tr.mode];
  $('#checkcard').innerHTML += `
    <div class="card" style="border:3px solid var(--b)">
      <h2>${tr.emoji} きょうは ${esc(tr.name)}の日</h2>
      ${Chara.tag(who,'wink', say, 92)}
      <a class="btn wide blue" href="train.html?mode=${tr.mode}" style="margin-top:8px">▶︎ ${esc(tr.name)}をやる（3〜5分）</a>
      <p class="muted" style="text-align:center;margin-top:8px">${esc(tr.why)}</p>
    </div>`;
}

/* ---- ④ きょうのミッション ---- */
const plan = Mastery.plan(goal);
const wrongCount = st.wrong.length;
$('#day-bar').style.width = Math.min(100, st.day.done / goal * 100) + '%';
const counts = {};
plan.forEach(q => { counts[q._why] = (counts[q._why]||0) + 1; });
const WHY = {'なおし':['🔁','まちがい直し'],'ふくしゅう':['♻️','ふくしゅう'],'よわいところ':['🧱','土台なおし'],
             'あたらしい':['✨','あたらしい'],'おうよう':['🔥','おうよう'],'しあげ':['🏁','しあげ']};
$('#plan-preview').innerHTML = plan.length
  ? `<div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px">${
      Object.entries(counts).map(([k,v]) => {
        const w = WHY[k] || ['•', k];
        return `<span class="chip">${w[0]} ${w[1]} ${v}問</span>`;
      }).join('')}</div>`
  : '';
$('#mission-txt').innerHTML = left === 0
  ? `きょうは <b>${st.day.done}問</b> やりました。もっとやりたいときは そのまま続けられます。`
  : `<b>${goal}問</b>だけ。いまのあなたに合わせて えらんであります。`;
if (left === 0) $('#go-daily').textContent = '▶︎ もう少しやる';
if (!wrongCount) { const w = $('#go-wrong'); w.style.opacity = .45; w.style.pointerEvents = 'none'; w.textContent = '🔁 まちがいなし'; }

/* ---- とくべつ練習の記録 ---- */
const R = st.records || {};
if (R.timeAttack && R.timeAttack.best && $('#rec-time'))
  $('#rec-time').textContent = `ベスト ${(R.timeAttack.best/1000).toFixed(1)}秒／問`;
Mastery.TRAINING.forEach(t => {
  const el = $('#rec-' + ({time:'time', pattern:'pat', steps:'step'}[t.mode]));
  if (!el) return;
  const last = R[t.mode] && R[t.mode].lastDate;
  if (!last) { if (!el.textContent) el.textContent = 'まだ やっていない'; return; }
  const d = Store.daysBetween(last, Store.today());
  const left = t.every - d;
  const txt = left <= 0 ? '▶︎ やるタイミング' : `つぎは あと${left}日`;
  el.textContent = el.textContent ? el.textContent + ' ・ ' + txt : txt;
});

/* ---- ⑤ いま ここ（フロンティア） ---- */
const bar = (v, c) => `<div class="bar" style="margin-top:4px"><i style="width:${Math.round(v*100)}%;background:${c}"></i></div>`;
$('#now').innerHTML = sum.frontier.length ? sum.frontier.map(f => {
  const u = f.u, s = f.s;
  const area = DATA.AREAS[u.area] || {};
  const phase = Mastery.phaseOf(s);
  return `<a class="unit" style="display:block;margin-bottom:10px" href="train.html?unit=${encodeURIComponent(u.id)}">
    <div style="display:flex;align-items:center;gap:9px">
      <span style="font-size:1.4rem">${u.emoji}</span>
      <span style="flex:1"><span class="t">${esc(u.name)}</span>
        <span class="m">${esc(area.name||'')} ・ ${esc(u.tag||'')}</span></span>
      <span class="chip ${phase==='おうよう'?'lv':'new'}">${WHY[phase] ? WHY[phase][0] : ''} ${phase}</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px">
      <div><div class="m">理解 ${Math.round(s.understand*100)}%</div>${bar(s.understand,'var(--b)')}</div>
      <div><div class="m">定着 ${Math.round(s.retain*100)}%</div>${bar(s.retain,'var(--c)')}</div>
      <div><div class="m">応用 ${Math.round(s.apply*100)}%</div>${bar(s.apply,'var(--a)')}</div>
    </div>
  </a>`;
}).join('') : '<p class="muted">まずはレベル診断からどうぞ。</p>';

/* ---- ⑥ 見つかっている「穴」 ---- */
const holes = [];
sum.frontier.forEach(f => Mastery.weakSpots(f.u.id).forEach(w => holes.push(w.id)));
Mastery.weakUnits(3).forEach(w => holes.push(w.id));
const uniq = [...new Set(holes)].slice(0, 4);
$('#holes').innerHTML = uniq.length ? `
  <div class="note d" style="margin-top:14px">
    <strong>🧱 先に埋めておきたい土台：</strong>
    ${uniq.map(id => { const u = DATA.unit(id); const a = DATA.AREAS[u.area]||{};
      return `<a href="train.html?unit=${encodeURIComponent(id)}" style="text-decoration:underline">${u.emoji}${esc(u.name)}<span style="font-size:.75em;color:var(--sub)">(${esc(a.name||'')})</span></a>`;
    }).join('・')}
    <div style="font-size:.8rem;color:var(--sub);margin-top:4px">上の単元でつまずく原因になっている所です。ここは自動でも出題されます。</div>
  </div>` : '';

/* ---- エリア（単元グリッド）---- */
function unitCard(u) {
  const s = Mastery.unitState(u.id);
  const pct = Math.round((s.understand*0.4 + s.retain*0.3 + s.apply*0.3) * 100);
  const locked = !s.open;
  const need = locked ? (Graph.pre(u.id).filter(p => !Mastery.unitState(p).done)
    .map(p => (DATA.unit(p)||{}).name).slice(0,2).join('・') || '前の単元') : '';
  return `<a class="unit ${s.done ? 'done' : ''} ${locked ? 'locked' : ''}"
      href="${locked ? 'javascript:void(0)' : 'train.html?unit=' + encodeURIComponent(u.id)}"
      ${locked ? `data-lock="${esc(need)}"` : ''}>
    ${u.lv >= 4 ? `<span class="lv">Lv${u.lv}</span>` : ''}
    <div class="t">${locked ? '🔒 ' : ''}${u.emoji} ${esc(u.name)}</div>
    <div class="m">${locked ? esc(need) + ' のあと' : `${s.seen}/${s.total}問 ・ ${pct}%`}</div>
    <div class="bar"><i style="width:${locked ? 0 : pct}%"></i></div>
  </a>`;
}
function island(area, extraClass) {
  const units = DATA.byArea(area.id);
  if (!units.length) return '';
  const allQ = units.reduce((a,u) => a + DATA.byUnit(u.id).length, 0);
  const done = units.filter(u => Mastery.unitState(u.id).done).length;
  return `<div class="island ${extraClass}">
    <div class="island-head">
      <span class="emo">${area.emoji}</span>
      <div style="flex:1">
        <h2>${area.name}</h2>
        <div class="p">${units.length}単元 ・ ${allQ}問 ・ クリア ${done}</div>
      </div>
      <span style="font-size:1.1rem;opacity:.9" class="tw">▾</span>
    </div>
    <div class="unit-grid" style="display:none">${units.map(unitCard).join('')}</div>
  </div>`;
}
$('#juken').innerHTML  = DATA.areasOf('juken').map(a => island(a, a.id === 'jk-hard' ? 'jk hard' : 'jk')).join('');
$('#grades').innerHTML = DATA.areasOf('grade').map(a => island(a, a.id)).join('');

const activeAreas = new Set(sum.frontier.map(f => f.u.area));
document.querySelectorAll('.island-head').forEach(head => {
  const grid = head.nextElementSibling, tw = head.querySelector('.tw');
  const box = head.closest('.island');
  const open = [...activeAreas].some(a => box.classList.contains(a) || box.classList.contains(a.replace('jk-','')))
    || [...grid.querySelectorAll('.unit')].some(u => { const w = u.querySelector('.bar i').style.width; return w && w !== '0%'; });
  if (open) { grid.style.display = 'grid'; tw.textContent = '▴'; }
  head.style.cursor = 'pointer';
  head.addEventListener('click', () => {
    const show = grid.style.display === 'none';
    grid.style.display = show ? 'grid' : 'none';
    tw.textContent = show ? '▴' : '▾';
    SFX.tap();
  });
});
document.querySelectorAll('[data-lock]').forEach(el => el.addEventListener('click', e => {
  e.preventDefault(); SFX.wrong();
  Quiz.toast(`まだ開いていません。<br>先に <b>${el.dataset.lock}</b> をクリアしよう`);
}));

/* ---- キャラをなでる ---- */
Chara.bindTap(document, () => {
  SFX.coin();
  const lines = ['きょうも いっしょに がんばろう！','図をかくと 見えてくるよ。','まちがえた問題は 宝ものだよ。',
    'ねる前にやると 記憶にのこりやすいんだって。','5問でいい。つづけるのが つよい。',
    '前の単元がかたまると、上の学年でも かんたんに見えてくる。'];
  Quiz.toast(lines[Math.floor(Math.random()*lines.length)]);
});
Chara.followPointer();
})();
