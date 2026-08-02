/* =========================================================
   ホーム画面の組み立て (home.js)
   ========================================================= */
(() => {
'use strict';
const $ = s => document.querySelector(s);
const st = Store.state;
const who = st.chara || 'pika';
const HOME_GRADE = Store.get('home') || 'g4';

/* ---- あいさつ ---- */
const h = new Date().getHours();
const greet = h < 9 ? 'おはよう！' : h < 17 ? 'こんにちは！' : h < 20 ? 'おかえり！' : 'こんばんは！';
const goal = Store.get('dailyGoal') || 5;
const left = Math.max(0, goal - st.day.done);
const expr = left === 0 ? 'excited' : (h >= 21 ? 'sleep' : 'happy');

$('#hero-ch').innerHTML = Chara.svg(who, expr, 88);
$('#hello').textContent = greet;
$('#hello-sub').textContent = left === 0
  ? `きょうのぶんは 終わり！ ${st.day.correct}問せいかい 🎉`
  : (h >= 20 ? 'ねる前がいちばん覚えられる時間だよ' : `のこり ${left}問`);

/* ---- ステータス ---- */
$('#stats').innerHTML = `
  <div class="stat hot"><div class="ico">🔥</div><div class="n">${st.streak.n}</div><div class="l">れんぞく日</div></div>
  <div class="stat"><div class="ico">📦</div><div class="n">${Store.masteredCount()}</div><div class="l">おぼえた</div></div>
  <div class="stat coin"><div class="ico">🪙</div><div class="n">${st.coins}</div><div class="l">コイン</div></div>
  <div class="stat crown"><div class="ico">🏅</div><div class="n">${Object.keys(st.badges).length}</div><div class="l">バッジ</div></div>`;

/* ---- ミッション ---- */
const pool = Store.dailyPool(DATA.all(), HOME_GRADE);
const dueCount = pool.filter(q => st.cards[q.id] && st.cards[q.id].box > 0 && st.cards[q.id].due <= Store.today()).length;
const wrongCount = st.wrong.length;
$('#day-bar').style.width = Math.min(100, st.day.done / goal * 100) + '%';
$('#mission-txt').innerHTML = left === 0
  ? `きょうは <b>${st.day.done}問</b> やりました。もっとやりたいときは そのまま続けられます。`
  : `<b>${goal}問</b>だけ。ふくしゅう <b>${dueCount}問</b>が待っています${wrongCount ? `／まちがいノート <b>${wrongCount}問</b>` : ''}。`;
if (left === 0) $('#go-daily').textContent = '▶︎ もう少しやる';
if (!wrongCount) { const w = $('#go-wrong'); w.classList.add('btn'); w.style.opacity = .45; w.style.pointerEvents = 'none'; w.textContent = '🔁 まちがいなし'; }

/* ---- エリア（単元グリッド）---- */
function unitCard(u) {
  const qs = DATA.byUnit(u.id);
  const s = Store.unitStats(u.id, qs.map(q => q.id));
  const pct = Math.round(s.mastery * 100);
  return `<a class="unit ${s.done ? 'done' : ''}" href="train.html?unit=${encodeURIComponent(u.id)}">
    ${u.lv >= 4 ? `<span class="lv">Lv${u.lv}</span>` : ''}
    <div class="t">${u.emoji} ${u.name}</div>
    <div class="m">${s.touched}/${s.total}問 ・ ${pct}%</div>
    <div class="bar"><i style="width:${pct}%"></i></div>
  </a>`;
}
function island(area, extraClass) {
  const units = DATA.byArea(area.id);
  if (!units.length) return '';
  const allQ = units.flatMap(u => DATA.byUnit(u.id).map(q => q.id));
  const done = units.filter(u => Store.unitStats(u.id, DATA.byUnit(u.id).map(q=>q.id)).done).length;
  return `<div class="island ${extraClass}">
    <div class="island-head">
      <span class="emo">${area.emoji}</span>
      <div style="flex:1">
        <h2>${area.name}</h2>
        <div class="p">${units.length}単元 ・ ${allQ.length}問 ・ クリア ${done}</div>
      </div>
      <span style="font-size:1.1rem;opacity:.9" class="tw">▾</span>
    </div>
    <div class="unit-grid" style="display:none">${units.map(unitCard).join('')}</div>
  </div>`;
}
$('#juken').innerHTML  = DATA.areasOf('juken').map(a => island(a, 'jk')).join('');
$('#grades').innerHTML = DATA.areasOf('grade').map(a => island(a, a.id)).join('');

document.querySelectorAll('.island-head').forEach(head => {
  const grid = head.nextElementSibling, tw = head.querySelector('.tw');
  const area = head.closest('.island');
  // 今の学年と、進行中の中受エリアは最初から開く
  const open = area.classList.contains(HOME_GRADE)
    || [...grid.querySelectorAll('.unit')].some(u => u.querySelector('.bar i').style.width !== '0%');
  if (open) { grid.style.display = 'grid'; tw.textContent = '▴'; }
  head.style.cursor = 'pointer';
  head.addEventListener('click', () => {
    const show = grid.style.display === 'none';
    grid.style.display = show ? 'grid' : 'none';
    tw.textContent = show ? '▴' : '▾';
    SFX.tap();
  });
});

/* ---- キャラをなでる ---- */
Chara.bindTap(document, () => {
  SFX.coin();
  const lines = ['きょうも いっしょに がんばろう！','図をかくと 見えてくるよ。','まちがえた問題は 宝ものだよ。',
    'ねる前にやると 記憶にのこりやすいんだって。','5問でいい。つづけるのが つよい。'];
  Quiz.toast(lines[Math.floor(Math.random()*lines.length)]);
});
Chara.followPointer();
})();
