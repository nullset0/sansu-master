/* 算数マスターの進度シミュレーション（Node版・ヘッドレス）
   ブラウザ版 _simtest.html と同じモデル。1日の問題数を振って比較する。 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const APP = path.join(__dirname, '..');   // このファイルは <アプリ>/tools/ に置く

// ---- 日付を偽装（Store.today() を動かす）
let DAY = 0;
const RealDate = Date;
const BASE = RealDate.parse('2026-04-06T09:00:00Z');
function FakeDate(...a) {
  if (!(this instanceof FakeDate)) return new FakeDate(...a).toString();
  return a.length ? new RealDate(...a) : new RealDate(BASE + DAY * 86400000);
}
FakeDate.prototype = RealDate.prototype;
FakeDate.now = () => BASE + DAY * 86400000;
FakeDate.parse = RealDate.parse; FakeDate.UTC = RealDate.UTC;

// ---- 最小のブラウザ環境
const store = {};
const sandbox = {
  console, JSON, Math: Object.create(Math), Object, Array, Number, String, Boolean, Set, Map, Date: FakeDate,
  structuredClone, parseFloat, parseInt, isNaN, setTimeout, clearTimeout,
  localStorage: {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
  },
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const SRC = ['app/store.js', 'data/core.js',
  'questions/g1.js','questions/g2.js','questions/g3.js','questions/g4.js','questions/g5.js','questions/g6.js',
  'data/elem.js','data/jk-num.js','data/jk-ratio.js','data/jk-toku.js','data/jk-speed.js','data/jk-geo.js',
  'data/jk-calc.js','data/jk-speed2.js','data/jk-geo2.js','data/jk-num2.js','data/jk-drill.js','data/hard.js',
  'data/graph.js','app/mastery.js','app/goal.js'];
SRC.forEach(f => vm.runInContext(fs.readFileSync(path.join(APP, f), 'utf8'), sandbox, { filename: f }));

const { Store, DATA, Graph, Mastery, Goal } = sandbox;

// ---- 生徒モデル（_simtest.html と同一）
const rng = seed => { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
const preDone = id => Graph.pre(id).every(p => Store.state.units[p] && Store.state.units[p].everDone);
function pOf(q, p0) {
  const c = Store.state.cards[q.id];
  const rep = c ? Math.min(3, c.seen) : 0;
  let p = p0 - 0.06 * ((q.lv || 1) - 1);
  if (!preDone(q.unit)) p -= 0.25;
  p += 0.13 * rep;
  // FORGET=1 … 忘れる生徒。期日をすぎて放ってある問題ほど当たりにくい（期日の間隔1回ぶん放置で−0.12、最大−0.4）。
  //   既定の生徒は忘れないので、復習を減らして新規に全部ふると見かけ上いちばん速くなる。
  //   復習の枠・間隔の長さを比べるときは、こちらで見る。
  if (FORGET === 1 && c && c.due && c.box) {
    const over = Store.daysBetween(c.due, Store.today());
    if (over > 0) p -= Math.min(0.4, 0.12 * over / (Store.BOX_DAYS[c.box] || 1));
  }
  // FORGET=2 … 間隔反復の標準の仮定（SuperMemo）: 期日ちょうどで思い出せる確率9割、そこから指数で落ちる。
  //   最後に解いてからの日数 ÷ その箱の間隔 = 1 で 0.9、2 で 0.81、10 で 0.35。
  //   「忘れない生徒」(既定) と「少し忘れる生徒」(1) では、復習に枠を使う値打ちが出ない。
  if (FORGET === 2 && c && c.last && c.box) {
    const since = Store.daysBetween(c.last, Store.today());
    const iv = Store.BOX_DAYS[c.box] || 1;
    p *= Math.pow(0.9, since / iv);
  }
  // FORGET=3 … 期日までは忘れない。期日をすぎた分だけ指数で落ちる（期日の間隔1回ぶん遅れるごとに×0.8）。
  if (FORGET === 3 && c && c.due && c.box) {
    const over = Store.daysBetween(c.due, Store.today());
    if (over > 0) p *= Math.pow(0.8, over / (Store.BOX_DAYS[c.box] || 1));
  }
  return Math.max(0.05, Math.min(0.97, p));
}
const FORGET = Number(process.env.FORGET || 0);

function run({ days = 365, perDay = 5, p0 = 0.80, seed = 7, placeAt = 'g3',
                goal = null, auto = false } = {}) {
  const rnd = rng(seed);
  sandbox.Math.random = rng(seed * 7919 + 1);   // 出題の並びも毎回おなじに（比較をぶれさせない）
  Object.keys(store).forEach(k => delete store[k]);
  DAY = 0;
  Store.importJSON('{}');
  Store.state.settings.dailyGoal = perDay;
  if (placeAt) Mastery.GRADES.slice(0, Mastery.GRADES.indexOf(placeAt) + 1).forEach(g => Mastery.assumeGrade(g));
  if (goal) {
    Goal.set(goal, null, 4);
    if (!auto) Store.set('dailyGoal', perDay);
  }
  // NOWEIGHT=1 … 到達は測るが、出題の並べかえは効かせない（比較用）
  if (process.env.NOWEIGHT === '1') Goal.unitWeight = () => 1;
  Store.save();

  const daily = [], goalHist = [];   // 毎日の到達点
  let stall = 0, checks = 0, demotes = 0, explains = 0, explainPass = 0;
  for (let d = 0; d < days; d++) {
    DAY = d;
    Store.rollDay();
    if (Mastery.checkDue()) {
      const list = Mastery.buildCheck(10);
      const res = list.map(q => {
        const ok = rnd() < pOf(q, p0) - 0.08;
        Store.grade(q.id, ok, q.unit, {});
        return { id: q.id, unit: q.unit, ok };
      });
      if (res.length >= 3) { const r = Mastery.finishCheck(res); checks++; demotes += r.demoted.length; }
    }
    // 「なぜ？チェック」待ちの単元があれば、その日に1つ受ける（4問・少し辛め）。
    // その日の問題数の内わけとして数える＝子どもの1日の量は増やさない。
    let budget = perDay;
    Mastery.explainDue(1).forEach(id => {
      const N = 4;
      let ok = 0;
      for (let k = 0; k < N; k++) if (rnd() < p0 - 0.10) ok++;
      Mastery.recordExplain(id, ok, N);
      explains += N; budget = Math.max(1, budget - N);
      if (ok / N >= Mastery.EXPLAIN_MIN) explainPass++;
    });

    if (auto) { const n = Goal.dailyCount(); if (n) budget = Math.max(1, n - (perDay - budget)); }
    const plan = Mastery.plan(budget);
    if (!plan.length) stall++;
    plan.forEach(q => Store.grade(q.id, rnd() < pOf(q, p0), q.unit, {}));
    const s = Mastery.summary();
    daily.push({ done: s.done, jk: s.jkDone, score: Goal.score() });
    if (goal) {
      const need = Goal.needSet();
      let n = 0; need.forEach(id => { if (Mastery.unitState(id).done) n++; });
      goalHist.push(n);
    }
  }
  const first = f => { const i = daily.findIndex(f); return i < 0 ? null : +( (i+1) / 30.4 ).toFixed(1); };
  const s = Mastery.summary();
  // 志望校に必要な単元がどこまで終わったか
  let goalDone = null, goalTotal = null, moGoal = null;
  if (goal) {
    const need = Goal.targetUnits(Goal.get().sch);
    goalTotal = need.length;
    goalDone = need.filter(id => Mastery.unitState(id).done).length;
    const i = goalHist.findIndex(x => x >= goalTotal);
    moGoal = i < 0 ? null : +((i + 1) / 30.4).toFixed(1);
  }
  return { perDay, p0, days,
    done: s.done, total: s.total, jk: s.jkDone, jkTotal: s.jkTotal,
    y1_done: (daily[364] || daily[daily.length-1]).done,
    y1_jk:   (daily[364] || daily[daily.length-1]).jk,
    mo_jk30: first(x => x.jk >= 30), mo_jk60: first(x => x.jk >= 60), mo_all: first(x => x.done >= s.total),
    stall, checks, demotes, explains, explainPass, goalDone, goalTotal, moGoal,
    // 本番の形の予想点（6ヶ月・1年・1年半・2年・最終日）
    score: [182, 365, 547, 730, days - 1].map(i => (daily[Math.min(i, daily.length - 1)] || {}).score) };
}

/* 使い方: node tools/sim.js <1日の問題数,…> <日数> <素の正答率> <開始学年>
   例:    node tools/sim.js 5,10,20 1080 0.65 g2                       */
const rows = [];
const P0 = Number(process.argv[4] || 0.80);
const PLACE = process.argv[5] || 'g3';
for (const perDay of (process.argv[2] || '3,5,8,10,15').split(',').map(Number)) {
  const r = run({ days: Number(process.argv[3] || 1080), perDay, p0: P0, placeAt: PLACE,
                  goal: process.env.GOAL || null, auto: process.env.AUTO === '1',
                  seed: Number(process.env.SEED || 7) });
  rows.push(r);
  console.log(JSON.stringify(r));
}
console.log(`\n素の正答率 ${P0} ・ 開始 ${PLACE}`);
console.log('\n1日の問題数 | ' + (Number(process.argv[3] || 1080) >= 365 ? '1年後' : '最終日') + 'の中受単元 | 中受30単元まで | 中受60/60まで | 全115単元まで | 停滞日');
rows.forEach(r => console.log(
  `${String(r.perDay).padStart(2)}問 | ${String(r.y1_jk).padStart(2)}/60 | ` +
  `${r.mo_jk30 ? r.mo_jk30 + 'ヶ月' : '未達'} | ${r.mo_jk60 ? r.mo_jk60 + 'ヶ月' : '未達'} | ` +
  `${r.mo_all ? r.mo_all + 'ヶ月' : '未達'} | ${r.stall}日`));
