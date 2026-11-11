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
   ※ 小問数は公表されていないため 17問と仮定している（香里算数道場の模試と同じ・1問あたり約176秒の根拠）。
------------------------------------------------------------ */
const SCHOOLS = {
  'chuken-standard': {
    id:'chuken-standard', name:'中学受験（中堅上位）', short:'中学受験',
    examMD: '01-16',                       // 関西の私立中入試は1月中旬
    math: { minutes:50, points:120, items:17 },  // 大問7題・小問17問（香里算数道場の模試と同じ組み立て）
    passRate: 0.70,                        // 合格ラインは得点率65〜75%のまん中
    hensachi: '53〜59',
    // 出題の重み。1.0を基準に、厚いところを上げる（出題分析より）
    weights: { 'jk-geo':1.5, 'jk-geo2':1.5, 'jk-calc':1.4, 'jk-speed':1.2, 'jk-speed2':1.2,
               'jk-num':1.2, 'jk-num2':1.2, 'jk-toku':1.2, 'jk-ratio':1.0, 'jk-drill':1.0 },
    // 難関チャレンジはこの学校には過剰。必須から外す
    exclude: ['jk-hard'],
    note: '私立中入試は図形（角度・平面・立体・水量）の比重が高く、計算の速さと正確さが土台になります。',
    // 得点の目安（同志社香里 前期・算数120点の5年平均。出典は香里算数道場の設計タブ）
    bench: { examinee: 69, pass: 83 },
    // 本番の組み立て。配点は非公開なので小問の点を仮置き（大問1・2=6点、3〜5=8点、6=7点、7=8点）。
    // 単元は「その大問でよく出るもの」。1つの単元が2つの大問に出ることもある。
    blueprint: [
      { key:'calc',  name:'大問1 計算',        pts:12, units:['jk-gyakusan','jk-bunsu-keisan','jk-kufu'] },
      { key:'one',   name:'大問1 一行題',      pts:6,  units:['jk-wariai','jk-wasa','jk-ueki','jk-heikin','jk-baisu','jk-hayasa','jk-tsurukame'] },
      { key:'fig',   name:'大問2 図形の小問',  pts:24, units:['jk-kakudo','jk-menseki','jk-en','jk-taiseki','jk-souji'] },
      { key:'speed', name:'大問3〜5 速さ',     pts:16, units:['jk-hayasa','jk-tabibito','jk-tsuuka','jk-ryuusui','jk-tokei','jk-diagram','jk-hayasa-hi'] },
      { key:'rule',  name:'大問3〜5 規則性・場合の数', pts:16, units:['jk-suuretsu','jk-gunsuuretsu','jk-amari','jk-houjin','jk-ueki','jk-baai','jk-michi'] },
      { key:'wari',  name:'大問3〜5 和と差・割合', pts:16, units:['jk-wasa','jk-bunpai','jk-tsurukame','jk-kabusoku','jk-sashuu','jk-shoukyo','jk-nenrei','jk-heikin',
                                                          'jk-soutou','jk-baisuu-zan','jk-noudo','jk-songi','jk-shigoto','jk-newton','jk-hi','jk-wariai'] },
      { key:'plane', name:'大問6 平面図形',    pts:14, units:['jk-fukugou','jk-souji','jk-idou','jk-menseki','jk-en'] },
      { key:'solid', name:'大問7 立体図形',    pts:16, units:['jk-taiseki','jk-suisou','jk-setsudan','jk-kaiten','jk-tenkai'] },
    ],
  },
};

/* ---------- 1単元を仕上げるのに必要な問題数（実測） ----------
   tools/sim.js で、1日10問・1年生からまっさらに始めて全115単元を
   仕上げるまでにかかった総問題数 ÷ 115。正答率ごとに実測した値。
   「なぜ？チェック」ぶんも1日の問題数の内わけとして含む（ゲートの分だけ約1割増える）。
   ★ 苦手な子ほど必要量が増える。ここを推測で埋めない。
   2026-11-11 に取り直し（箱9段・復習を新規より先に・日付の1日ずれ修正のあと）:
     node tools/sim.js 10 1500 <正答率> none  … 旧値(箱6段・復習3割)より 0〜12% 増
------------------------------------------------------------ */
const PER_UNIT = [
  { rate: 0.55, n: 81.4 },   // 30.8ヶ月 × 10問/日 ÷ 115単元（旧 84.1）
  { rate: 0.65, n: 62.4 },   // 23.6ヶ月（旧 60.5）
  { rate: 0.70, n: 57.4 },   // 21.7ヶ月（旧 55.5）
  { rate: 0.80, n: 51.5 },   // 19.5ヶ月（旧 46.8）
  { rate: 0.90, n: 46.0 },   // 17.4ヶ月（旧 41.0）
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
  // 入れ直しても起点（setAt）は最初の日のまま。毎回きょうにすると、3段の区切りが後ろへずれて遅れが消える
  const prev = st().goal;
  st().goal = { school: schoolId, exam: examDate || defaultExamDate(sch, gradeNow || 4),
                setAt: (prev && prev.setAt) || st().examGuessAt || Store.today() };
  _need = null; _needFor = null; _rm = null;   // 3段の流れも入試日が変わるので作り直す
  // 志望校を決めたら、1日の量はアプリが決める。親が数をにらむ必要をなくす。
  if (!st().settings.dailyGoalPinned) Store.set('dailyGoal', 'auto');
  Store.save();
  return st().goal;
}
function clear() {
  // 見立てをやめても、入れた学年から決まった入試日は3段の流れに残す（小4の推測に戻さない）
  if (st().goal && st().goal.exam) { st().examGuess = st().goal.exam; st().examGuessAt = st().goal.setAt || Store.today(); }
  st().goal = null;
  st().goalCleared = true;   // 自分で外したので、次に開いたとき自動では入れ直さない
  _need = null; _needFor = null; _rm = null;   // 3段の流れも入試日が変わるので作り直す
  // 「おまかせ」は志望校があってこそ。残すと問題数に 'auto' という文字列が流れる
  if (Store.get('dailyGoal') === 'auto') Store.set('dailyGoal', 5);
  Store.save();
}
function get() {
  const g = st().goal;
  if (!g || !SCHOOLS[g.school]) return null;
  return Object.assign({}, g, { sch: SCHOOLS[g.school] });
}
// 出題の並べかえと予想点に使う学校。受験の予定を入れていなくても、このアプリの目標
// （同志社香里）に合わせて並べる。1日の問題数（おまかせ）は予定を入れたときだけ変わる。
const DEFAULT_SCHOOL = 'chuken-standard';
function target() { const g = st().goal; return (g && SCHOOLS[g.school]) || SCHOOLS[DEFAULT_SCHOOL]; }

/* ---------- 本番の形で「いま受けたら何点か」 ----------
   単元ごとの「解ける見こみ」を出して、本番の大問ごとの配点にかける。
     見こみ ＝ 届いている広さ（その単元の問題の何割を一度は正解したか。8割で満点あつかい）
             × いまの当たり（解いた問題のうち、最後に答えたとき正解だった割合。少ないうちは5割に寄せる）
             × 覚えている度合い（復習の箱。期日を1回ぶん以上すぎて放ってある問題は半分に数える）
   仕上げた単元はおよそ 0.8〜0.95 になる（＝本番でも8〜9割取れる見こみ）。
   はじめていない単元は 0。本番では解けないものとして数える。
   ★ 目安であって、模試の点ではない。上がり下がりを見るための物差し。
------------------------------------------------------------ */
function unitAbility(id) {
  const qs = DATA.byUnit(id).map(q => q.id); if (!qs.length) return 0;
  const cards = st().cards, today = Store.today();
  let seen = 0, last = 0, ever = 0, keep = 0;
  qs.forEach(q => {
    const c = cards[q]; if (!c || !c.seen) return;
    seen++; if (c.run > 0) last++;
    if (c.ok > 0) {
      ever++;
      let r = Math.min(1, (c.box || 0) / 4);
      const over = c.due ? Store.daysBetween(c.due, today) : 0;
      // 長く放ってある＝忘れかけ。期日を「その箱の間隔1回ぶん」すぎたら半分。ただし箱が大きい（70〜300日）と
      // 1回ぶんが長すぎるので Store.STALE_CAP_DAYS（35日）で頭打ち（箱9なら期日＋35日で半分に数える）
      if (over > Math.min(Store.STALE_CAP_DAYS, Store.BOX_DAYS[c.box] || 1)) r *= 0.5;
      keep += r;
    }
  });
  if (!seen) return 0;
  const reach = Math.min(1, ever / qs.length / 0.8);
  const acc = (last + 1) / (seen + 2);
  const ret = ever ? 0.6 + 0.4 * keep / ever : 0.6;
  return Math.max(0, Math.min(1, reach * acc * ret));
}
// 大問ごとに、その大問の単元と1単元あたりの点（配点 ÷ 単元数）。予想点と並べかえの両方がこれを使う
function split(sch) {
  return sch.blueprint.map(b => {
    const units = b.units.filter(id => DATA.unit(id));
    return { b, units, per: units.length ? b.pts / units.length : 0 };
  });
}
// 合計だけ（1問答えるたびに呼ぶので、伸ばしどころの一覧は作らない）
function score(sch = target()) { const p = predict(sch, { gains:false }); return p ? p.total : null; }
// 予想点の推移。きょうから7日ずつさかのぼった区切り（暦の週ではない）ごとに、その週の最後の値（きょうは いまの値）。
// 保護者画面と週報で同じ取り方にする
function scoreTrend(n = 8) {
  const today = Store.today(), out = [];
  const h = st().history.filter(x => x.score != null && x.d < today)
    .concat([{ d: today, score: score() }]);
  const seen = new Set();
  for (let i = h.length - 1; i >= 0 && out.length < n; i--) {
    const wk = Math.floor(Store.daysBetween(h[i].d, today) / 7);
    if (!seen.has(wk)) { seen.add(wk); out.unshift(h[i]); }
  }
  return out;
}
function predict(sch = target(), opt = {}) {
  if (!sch || !sch.blueprint) return null;
  const ab = {}; const A = id => (id in ab ? ab[id] : (ab[id] = unitAbility(id)));
  const gain = {};
  const sections = split(sch).map(({ b, units, per }) => {
    let got = 0;
    units.forEach(id => { const a = A(id); got += per * a; gain[id] = (gain[id] || 0) + per * (1 - a); });
    // 大問ごとは整数で見せ、合計はその足し算にする（足して合わない数字を出さない）
    const g = Math.round(got);
    return { key:b.key, name:b.name, pts:b.pts, got:g, rate: b.pts ? g / b.pts : 0, units };   // 棒も見せる数字と同じ値で
  });
  const total = sections.reduce((a, x) => a + x.got, 0);
  if (opt.gains === false) return { total, max: sch.math.points, bench: sch.bench || null, sections };
  // 伸ばしどころ: いま取り組める単元のうち、仕上げると上がる点の多い順
  const gains = Object.entries(gain)
    .map(([id, g]) => { const s = Mastery.unitState(id);
      return { id, name: DATA.unit(id).name, gain: +g.toFixed(1), ability: A(id), open: s.open, done: s.done }; })
    .filter(x => x.gain >= 0.5)
    .sort((a, b) => (b.open - a.open) || (b.gain - a.gain));
  return { total, max: sch.math.points, bench: sch.bench || null, sections, gains };
}
// 単元1つが本番で何点ぶんか（大問の配点 ÷ その大問の単元数 を足し合わせたもの）
let _pts = null, _ptsFor = null;
function unitPoints(id, sch = target()) {
  if (!sch || !sch.blueprint) return 0;
  if (_ptsFor !== sch.id) {
    _ptsFor = sch.id; _pts = {};
    split(sch).forEach(({ units, per }) => units.forEach(u => { _pts[u] = (_pts[u] || 0) + per; }));
  }
  return _pts[id] || 0;
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
const DAILY_MAX = STEPS[STEPS.length - 1];   // 1日の上限（3段の流れの表示もこれで頭打ちを出す）
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
  let raw = s.daysLeft > 0 ? (left * per) / s.daysLeft : 25;
  raw = Math.max(raw, roadmapPace(s.rate).need);   // 3段の区切りにも間に合わせる（段が全部おわれば0）
  return STEPS.find(x => x >= raw) || DAILY_MAX;
}

/* ---------- その単元は志望校に要るか・どれくらい出るか ----------
   0 なら「この学校には要らない」。毎日の出題はこれで並べかえる。
------------------------------------------------------------ */
let _need = null, _needFor = null;
function needSet() {
  const sch = target(); if (!sch) return null;
  if (_need && _needFor === sch.id) return _need;
  _needFor = sch.id; _need = new Set(targetUnits(sch));
  return _need;
}
// 並べかえの重み。本番の配点が厚い単元ほど大きい（計算・図形が上に来る）。
// 配点の表に無い単元（前提の学年の単元など）は分野の重み。
// ★ 受験の予定が無くても、難関チャレンジは 0＝後回し。
//   要る単元が全部終わるか開いていないときにだけ回ってくる（香里に合わせるための意図した動き）。
// 学習の記録には左右されないので、学校ごとに1回だけ作って使い回す（並べかえで何千回も呼ばれる）。
let _w = null, _wFor = null;
function unitWeight(id) {
  const sch = target(); if (!sch) return 1;
  const key = sch.id + (st().goal ? ':goal' : ':none');
  if (_wFor !== key) { _wFor = key; _w = {}; }
  if (id in _w) return _w[id];
  const u = DATA.unit(id);
  let w;
  if (!u) w = 0;
  else if (!needSet().has(id))
    // この学校には要らない。ただし予定を入れていないときは、学校の単元（6年の比例など）は
    // これまでどおり重み1で残し、後回しにするのは難関チャレンジだけにする
    w = (st().goal || (sch.exclude || []).includes(u.area)) ? 0 : 1;
  else {
    // ★ 前提の単元にも点を渡す案は tools/sim.js で比べて差が誤差の内（±2点）だったので入れていない
    const p = unitPoints(id, sch);
    w = p > 0 ? 1 + p / 2 : ((sch.weights || {})[u.area] || 1);
  }
  return (_w[id] = w);
}

/* ---------- 3段の流れ（家の方針 2026-11-09） ----------
   ① 小4のうちに小6までの内容を「理解」する   … 小4の2月末まで
   ② 小5で特殊算・中受の図形を「仕上げる」     … 小5の1月末まで
   ③ 小6は過去問を回す（このアプリは 忘れ止めと、予想点の低い大問の補強）… 入試まで
   段の区切りは入試日から決める（入試の年の2年前の2月末・1年前の1月末）。
   予定を入れていなければ、いま小4として数える。
   いまの段＝まだ終わっていない最初の段。期限をすぎても終わるまではその段にいる（遅れとして出す）。
   出題はいまの段の単元を先に回す（mastery.js の frontier）。先の段の単元も、手が空けば出る。
------------------------------------------------------------ */
// 予定を入れていなければ、はじめて数えた日に「いま小4」として決めた入試日を覚えておく
// （毎回きょうから数えると、4月に学年が上がったとき入試日が1年ずれる）
function examDate() {
  const g = st().goal;
  if (g && g.exam) return g.exam;
  // 読むだけの関数なので保存はしない（次に1問記録したときの保存で一緒に残る）
  if (!st().examGuess) { st().examGuess = defaultExamDate(target(), 4); st().examGuessAt = Store.today(); }
  return st().examGuess;
}
// ①は「理解」まで（基本・応用を「済」と同じ割合まで一度は正解）。覚えている度合いは②の間の復習で上げる。
// ②は「済」（理解・応用・定着・なぜ？チェックがそろう）。
// ★ ①は香里に要る単元（中受の単元の前提になっている学校の単元）だけ。要らない小6の単元
//   （比例・データなど）は効率のため段に入れない＝手が空いたときに出る。
const febEnd = y => { const d = new Date(Date.UTC(y, 2, 0)); return d.toISOString().slice(0, 10); };   // うるう年も2月末
let _rm = null, _rmRev = -1, _rmDay = null;
function roadmap() {
  if (_rm && _rmRev === Store.rev && _rmDay === Store.today()) return _rm;
  const sch = target(), need = needSet(), exam = examDate(), y = Number(exam.slice(0, 4));
  const ids = [...need].filter(id => DATA.byUnit(id).length);   // 問題の無い単元は数えない（永久に終わらなくなる）
  const school = ids.filter(id => /^g\d$/.test(DATA.unit(id).area));
  const jk = ids.filter(id => DATA.unit(id).area.indexOf('jk') === 0);
  const today = Store.today();
  // 小5・小6から始めたときは、区切りを始めた日から入試までの間に割りふり直す。
  // ①は過ぎていれば はじめの25%まで、②は残りが入試までの半分より短ければ半分まで延ばす。
  // 過ぎた・近すぎる期限のまま数えると、初日から「期限すぎ」で25問に張り付く。
  const g0 = st().goal, start = (g0 && g0.setAt) || st().examGuessAt || today;
  const span = Math.max(0, Store.daysBetween(start, exam));
  const at = share => Store.addDays(start, Math.round(span * share));
  const later = (a, b) => (a > b ? a : b), earlier = (a, b) => (a < b ? a : b);
  const tokuEnd = later(`${y-1}-01-31`, at(0.5));
  const baseEnd = earlier(febEnd(y - 2) < start ? at(0.25) : febEnd(y - 2), tokuEnd);   // ②より前
  const stages = [
    { key:'base', name:'小6までの内容を理解する', when:'小4', end:baseEnd, units:school, ok:Mastery.understood },
    { key:'toku', name:'特殊算・図形を仕上げる',   when:'小5', end:tokuEnd, units:jk,     ok:s => s.done },
    { key:'kako', name:'過去問を回す',             when:'小6', end:exam,          units:[],     ok:() => true },
  ].map(x => {
    const done = x.units.filter(id => x.ok(Mastery.unitState(id))).length;
    return Object.assign(x, { total:x.units.length, done, left:x.units.length - done,
                              daysLeft: Store.daysBetween(today, x.end) });
  });
  let cur = stages.findIndex(x => x.left > 0);
  if (cur < 0) cur = stages.length - 1;
  stages.forEach((x, i) => { x.current = i === cur; x.late = x.left > 0 && x.daysLeft < 0; });
  const stageOf = {};
  stages.forEach((x, i) => x.units.forEach(id => { if (!(id in stageOf)) stageOf[id] = i; }));
  _rm = { exam, stages, cur, stageOf, assumed: !st().goal };
  _rmRev = Store.rev; _rmDay = today;
  return _rm;
}
// 並べかえ用: いまの段（とそれより前）の単元は0、先の段・どの段にも無い単元は1
function stageRank(id) {
  const r = roadmap(), i = r.stageOf[id];
  return i == null || i > r.cur ? 1 : 0;
}
// ★ ①で「理解」まで来た単元を3枠から外す案は試してやめた（2026-11-09・シミュレーション）。
//   上の単元が開くには前提の定着（箱）も要るので、外すと①の完了がかえって3〜4か月遅れた。
// 段の期限に間に合う1日の問題数。期限の近い段ほど先に効く。前の段の残りも後ろの段の期限までに
// 要るので、足しあわせて比べる。
// ①の1単元あたりの量は perUnit の1.6倍（tools/sim 相当の実測: 2026-11 に小3まで済みから始めて、
// 正答率0.7で残り25単元に2,251問＝90問/単元・0.8で1,811問＝72問/単元）。前提の定着を待つ間も
// 復習が積まれるので「理解まで」でも全単元平均より多い。
// ②は1.0倍だと最後の数単元が長びいて期限を3か月すぎた（1日の量を下げすぎる）ので、1.4倍で見る。
const STAGE_PER = { base:1.6, toku:1.4 };
// 戻り値: { need: いちばんきつい段に合わせた1日の数, perDay: 段ごとの1日の数（終わった段・単元なしは null） }
// 残り日数は30日を下限にする。期限の直前に跳ね上がって、すぎた途端に下がる（遅れているのに
// ゆるめる）のを防ぐ。期限をすぎた段は「1か月で取りもどす」量として数えつづける。
// また、各段は期限の BUFFER_DAYS 日前に終える量で見る。最後の数単元は前提の定着待ち（日数）で
// 縮まらないので、期限ぴったりに合わせると間に合わない（シミュレーションで②が2か月遅れた）。
const CATCHUP_DAYS = 30, BUFFER_DAYS = 60;
function roadmapPace(rate) {
  const r = roadmap(), per = perUnit(rate == null ? 0.6 : rate);
  let acc = 0, need = 0;
  const perDay = r.stages.map(x => {
    acc += x.left * per * (STAGE_PER[x.key] || 1);
    if (!x.units.length || x.left <= 0) return null;
    const v = acc / Math.max(CATCHUP_DAYS, x.daysLeft - BUFFER_DAYS);
    need = Math.max(need, v);
    return Math.ceil(v);
  });
  return { need, perDay };
}
// 段の状態のことば（保護者画面と週報で同じものを使う）
function stageLabel(x) {
  if (x.units.length && x.left === 0) return 'おわり';
  if (x.late) return '期限すぎ';
  return x.current ? 'いまここ' : '';
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

// このアプリは2029年1月に同志社香里を受ける1人のためのもの。受験の予定がまだ入っていない端末は、
// 開いた時点で「香里・2029年1月16日・おまかせ」を入れる（iPhone の設定はサーバーから書き換えられないため）。
// 保護者画面で予定を外したとき（goalCleared）と、1日の数を手で決めたとき（dailyGoalPinned）はそれに従う。
const DEFAULT_EXAM = '2029-01-16';
try { if (!st().goal && !st().goalCleared) set(DEFAULT_SCHOOL, DEFAULT_EXAM); }
catch (e) { if (typeof console !== 'undefined') console.warn('[受験の予定の既定]', e); }

return { SCHOOLS, schools, school, set, clear, get, defaultExamDate,
         targetUnits, recentRate, perUnit, speed, state, weekly,
         dailyCount, unitWeight, needSet, STEPS, roadmap, roadmapPace, stageRank, stageLabel, examDate, DAILY_MAX, target, predict, score, scoreTrend, unitAbility, unitPoints };
})();
if (typeof window !== 'undefined') window.Goal = Goal;
