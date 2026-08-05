/* =========================================================
   算数マスター — 志望校ゴールと逆算 (goal.js)

   「いつまでに・どこまで・1日何問」を毎日はじき出す。
   感覚ではなく、tools/sim.js で実測した必要量から計算する。
   ========================================================= */
const Goal = (() => {
'use strict';

const st = () => Store.state;

/* ---------- 到達の目安（画面には出さない） ----------
   ★ 志望校は表示しない。ここは「どのくらいの学力まで持っていくか」を
     決めるための内部の目安であって、子どもに見せる目標ではない。
     上限でもない。目安ぶんが終わったら、そのまま先へ進む。

   目安に使った実在の入試（出典＝学校の入試概要と各塾の入試分析）:
   ・前期は1月中旬の土曜（2026年度=1/17、2027年度=1/16）
   ・算数は50分120点。大問7題。
     大問1＝計算2問＋文章題1問／大問2＝図形の小問集合／
     大問3以降＝速さ・規則性・年齢算などの文章題と図形。
   ・図形（角度・平面・立体・水量変化）の比率が高い。
   ・合格ラインは得点率65〜75%前後（年により変動）。
   ※ 小問数は公表されていないため 20問と仮定している（1問あたり150秒の根拠）。
------------------------------------------------------------ */
const SCHOOLS = {
  'chuken-standard': {
    id:'chuken-standard', name:'中学受験（中堅上位）', short:'中学受験',
    examMD: '01-16',                       // 関西の私立中入試は1月中旬
    math: { minutes:50, points:120, items:20 },
    passRate: 0.70,                        // 合格ラインは得点率65〜75%のまん中
    hensachi: '53〜59',
    // 出題の重み。1.0を基準に、厚いところを上げる（出題分析より）
    weights: { 'jk-geo':1.5, 'jk-geo2':1.5, 'jk-calc':1.4, 'jk-speed':1.2, 'jk-speed2':1.2,
               'jk-num':1.2, 'jk-num2':1.2, 'jk-toku':1.2, 'jk-ratio':1.0, 'jk-drill':1.0 },
    // 難関チャレンジはこの学校には過剰。必須から外す
    exclude: ['jk-hard'],
    note: '私立中入試は図形（角度・平面・立体・水量）の比重が高く、計算の速さと正確さが土台になります。',
  },
};

/* ---------- 1単元を仕上げるのに必要な問題数（実測） ----------
   tools/sim.js で、1日10問・1年生からまっさらに始めて全115単元を
   仕上げるまでにかかった総問題数 ÷ 115。正答率ごとに実測した値。
   「なぜ？チェック」ぶんも1日の問題数の内わけとして含む（ゲートの分だけ約1割増える）。
   ★ 苦手な子ほど必要量が増える。ここを推測で埋めない。
------------------------------------------------------------ */
const PER_UNIT = [
  { rate: 0.55, n: 84.1 },   // 31.8ヶ月 × 10問/日 ÷ 115単元
  { rate: 0.65, n: 60.5 },   // 22.9ヶ月
  { rate: 0.70, n: 55.5 },   // 21.0ヶ月
  { rate: 0.80, n: 46.8 },   // 17.7ヶ月
  { rate: 0.90, n: 41.0 },   // 15.5ヶ月
];
function perUnit(rate) {
  const r = Math.max(0.35, Math.min(0.95, rate || 0.6));
  if (r <= PER_UNIT[0].rate) {                    // 実測の外は、いちばん外の傾きで延ばす
    const a = PER_UNIT[0], b = PER_UNIT[1];
    return a.n + (a.rate - r) * (a.n - b.n) / (b.rate - a.rate);
  }
  for (let i = 1; i < PER_UNIT.length; i++) {
    const a = PER_UNIT[i-1], b = PER_UNIT[i];
    if (r <= b.rate) return a.n + (r - a.rate) * (b.n - a.n) / (b.rate - a.rate);
  }
  return PER_UNIT[PER_UNIT.length-1].n;
}

/* ---------- 設定 ---------- */
function schools() { return Object.values(SCHOOLS); }
function school(id) { return SCHOOLS[id] || null; }

// 入試の年：小6の1月。いまが4月以降なら「学年が上がる回数」で数える。
function defaultExamDate(sch, gradeNow = 4, todayISO = Store.today()) {
  const [y, m] = todayISO.split('-').map(Number);
  const schoolYear = m >= 4 ? y : y - 1;          // 4月はじまり
  const examYear = schoolYear + (6 - gradeNow) + 1;
  return `${examYear}-${sch.examMD}`;
}

function set(schoolId, examDate, gradeNow) {
  const sch = SCHOOLS[schoolId];
  if (!sch) return null;
  st().goal = { school: schoolId, exam: examDate || defaultExamDate(sch, gradeNow || 4),
                setAt: Store.today() };
  _need = null; _needFor = null;
  // 志望校を決めたら、1日の量はアプリが決める。親が数をにらむ必要をなくす。
  if (!st().settings.dailyGoalPinned) Store.set('dailyGoal', 'auto');
  Store.save();
  return st().goal;
}
function clear() {
  st().goal = null;
  _need = null; _needFor = null;
  // 「おまかせ」は志望校があってこそ。残すと問題数に 'auto' という文字列が流れる
  if (Store.get('dailyGoal') === 'auto') Store.set('dailyGoal', 5);
  Store.save();
}
function get() {
  const g = st().goal;
  if (!g || !SCHOOLS[g.school]) return null;
  return Object.assign({}, g, { sch: SCHOOLS[g.school] });
}

/* ---------- 必要な単元 ----------
   中受エリア（jk-*、ただし除外分をのぞく）と、その前提になっている
   小学校の単元。学年ではなく前提グラフでたどる。
------------------------------------------------------------ */
function targetUnits(sch) {
  const ex = new Set(sch.exclude || []);
  const core = DATA.units.filter(u => u.area.indexOf('jk') === 0 && !ex.has(u.area)).map(u => u.id);
  const need = new Set(core);
  core.forEach(id => Graph.ancestors(id).forEach(a => need.add(a)));
  return [...need].filter(id => DATA.unit(id));
}

/* ---------- いまの正答率（直近の実測） ---------- */
function recentRate(days = 21) {
  const h = Store.lastDays(days);
  const done = h.reduce((a,x) => a + (x.done||0), 0);
  const ok   = h.reduce((a,x) => a + (x.correct||0), 0);
  if (done >= 30) return ok / done;
  // 記録が足りないときは、全期間の単元成績で代用する
  const u = Object.values(st().units);
  const s = u.reduce((a,x) => a + (x.seen||0), 0), o = u.reduce((a,x) => a + (x.ok||0), 0);
  return s >= 20 ? o / s : null;
}

/* ---------- 1問あたりの時間（処理速度） ---------- */
function speed(sch) {
  const target = Math.round(sch.math.minutes * 60 / sch.math.items);   // 秒/問
  const ex = new Set(sch.exclude || []);
  let ms = 0, n = 0;
  Object.entries(st().units).forEach(([id, u]) => {
    const d = DATA.unit(id);
    if (!d || d.area.indexOf('jk') !== 0 || ex.has(d.area)) return;
    ms += u.ms || 0; n += u.msN || 0;
  });
  const avg = n >= 20 ? Math.round(ms / n / 1000) : null;
  return { targetSec: target, avgSec: avg, n, ok: avg == null ? null : avg <= target };
}

/* ---------- 逆算のまとめ ---------- */
function state() {
  const g = get();
  if (!g) return null;
  const sch = g.sch;
  const need = targetUnits(sch);
  const done = need.filter(id => Mastery.unitState(id).done);
  const left = need.length - done.length;
  const daysLeft = Math.max(0, Store.daysBetween(Store.today(), g.exam));
  const rate = recentRate();
  const per = perUnit(rate == null ? 0.6 : rate);
  const attemptsLeft = Math.round(left * per);
  const perDayNeeded = daysLeft > 0 ? Math.ceil(attemptsLeft / daysLeft) : attemptsLeft;

  // いまのペース＝直近3週間の1日あたり（やらなかった日も母数に入れる）
  const h = Store.lastDays(21);
  const perDayNow = +(h.reduce((a,x) => a + (x.done||0), 0) / h.length).toFixed(1);
  const goalSet = Store.get('dailyGoal') || 5;
  // 何日で終わるか（いまのペース／設定どおりやった場合）
  const finishAtNow = perDayNow > 0 ? Math.ceil(attemptsLeft / perDayNow) : null;
  const finishAtGoal = Math.ceil(attemptsLeft / goalSet);

  let verdict = 'ok';                                   // 間に合う
  if (perDayNow < perDayNeeded * 0.8) verdict = 'behind';   // いまのペースだと遅れる
  else if (perDayNow < perDayNeeded) verdict = 'tight';     // ぎりぎり

  // 分野べつの到達（出題の重みつき）
  const areas = {};
  need.forEach(id => {
    const u = DATA.unit(id); if (!u) return;
    const a = areas[u.area] || (areas[u.area] = { area:u.area, name:(DATA.AREAS[u.area]||{}).name||u.area,
                                                  total:0, done:0, w:(sch.weights||{})[u.area] || 1 });
    a.total++; if (Mastery.unitState(id).done) a.done++;
  });
  const areaRows = Object.values(areas)
    .sort((a,b) => (b.w - a.w) || (a.done/a.total - b.done/b.total));

  return { goal:g, sch, exam:g.exam, daysLeft,
           needTotal: need.length, doneTotal: done.length, left,
           pct: need.length ? Math.round(done.length / need.length * 100) : 0,
           rate, perUnit: +per.toFixed(1), attemptsLeft,
           perDayNeeded, perDayNow, goalSet, finishAtNow, finishAtGoal,
           verdict, speed: speed(sch), areaRows,
           beyond: left <= 0 };                              // 目安ぶんは終わり、先へ進んでいる
}

/* ---------- きょう何問やればいいか（自動） ----------
   親が数を決めるのではなく、入試日までの残りから毎日はじき出す。
   ただし子どもがやる量なので、上限をつける。25問を超えて必要なら、
   それは「量で挽回できる範囲を超えた」ということなので、
   数を吊り上げずに 間に合わない と伝えるほうが正直。
------------------------------------------------------------ */
const STEPS = [5, 6, 8, 10, 12, 15, 20, 25];
function dailyCount() {
  const g = get();
  if (!g) return null;
  if (Store.get('dailyGoal') !== 'auto') return null;      // 手で決めているなら従う
  const s = state();
  if (!s) return null;
  // 目安ぶんが終わったら、そこで止めずに残り全部（難関ふくむ）へ切りかえる。
  // 「もっと上へ行けるなら行っていい」ので、ここを上限にしない。
  let left = s.left, per = perUnit(s.rate == null ? 0.6 : s.rate);
  if (left <= 0) left = DATA.units.filter(u => !Mastery.unitState(u.id).done).length;
  if (left <= 0) return 5;                                   // 全単元おわり＝維持
  const raw = s.daysLeft > 0 ? (left * per) / s.daysLeft : 25;
  return STEPS.find(x => x >= raw) || 25;
}

/* ---------- その単元は志望校に要るか・どれくらい出るか ----------
   0 なら「この学校には要らない」。毎日の出題はこれで並べかえる。
------------------------------------------------------------ */
let _need = null, _needFor = null;
function needSet() {
  const g = get(); if (!g) return null;
  if (_need && _needFor === g.school) return _need;
  _needFor = g.school; _need = new Set(targetUnits(g.sch));
  return _need;
}
function unitWeight(id) {
  const g = get(); if (!g) return 1;
  const u = DATA.unit(id); if (!u) return 0;
  if (!needSet().has(id)) return 0;                         // この学校には要らない
  return (g.sch.weights || {})[u.area] || 1;
}

/* ---------- 学力の推移（週ごと） ---------- */
function weekly(weeks = 12) {
  const days = Store.lastDays(weeks * 7);
  const out = [];
  for (let i = 0; i < days.length; i += 7) {
    const w = days.slice(i, i + 7);
    const done = w.reduce((a,x) => a + (x.done||0), 0);
    const ok   = w.reduce((a,x) => a + (x.correct||0), 0);
    const ms   = w.reduce((a,x) => a + (x.ms||0), 0);
    const active = w.filter(x => (x.done||0) > 0).length;
    out.push({ from: w[0].d, to: w[w.length-1].d, done, ok,
               rate: done ? ok/done : null, min: Math.round(ms/60000),
               activeDays: active, units: w[w.length-1].units || 0 });
  }
  return out;
}

return { SCHOOLS, schools, school, set, clear, get, defaultExamDate,
         targetUnits, recentRate, perUnit, speed, state, weekly,
         dailyCount, unitWeight, needSet, STEPS };
})();
if (typeof window !== 'undefined') window.Goal = Goal;
